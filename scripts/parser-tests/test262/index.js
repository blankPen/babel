import path from "path";
import { fileURLToPath } from "url";
import TestStream from "test262-stream";
import TestRunner from "../utils/parser-test-runner.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const ignoredFeatures = new Set([
  "__getter__",
  "__proto__",
  "__setter__",
  "AggregateError",
  "Array.prototype.at",
  "Array.prototype.flat",
  "Array.prototype.flatMap",
  "Array.prototype.item",
  "Array.prototype.values",
  "ArrayBuffer",
  "align-detached-buffer-semantics-with-web-reality",
  "arbitrary-module-namespace-names",
  "array-find-from-last",
  "async-functions",
  "async-iteration",
  "arrow-function",
  "Atomics",
  "Atomics.waitAsync",
  "BigInt",
  "caller",
  "class",
  "class-fields-private",
  "class-fields-private-in",
  "class-fields-public",
  "class-methods-private",
  "class-static-block",
  "class-static-fields-private",
  "class-static-fields-public",
  "class-static-methods-private",
  "cleanupSome",
  "coalesce-expression",
  "computed-property-names",
  "const",
  "cross-realm",
  "DataView",
  "DataView.prototype.getFloat32",
  "DataView.prototype.getFloat64",
  "DataView.prototype.getInt8",
  "DataView.prototype.getInt16",
  "DataView.prototype.getInt32",
  "DataView.prototype.getUint16",
  "DataView.prototype.getUint32",
  "DataView.prototype.setUint8",
  "default-parameters",
  "destructuring-assignment",
  "destructuring-binding",
  "dynamic-import",
  "error-cause",
  "export-star-as-namespace-from-module",
  "FinalizationGroup",
  "FinalizationRegistry",
  "FinalizationRegistry.prototype.cleanupSome",
  "Float32Array",
  "Float64Array",
  "for-in-order",
  "for-of",
  "generators",
  "globalThis",
  "hashbang",
  "host-gc-required",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Intl-enumeration",
  "Intl.DateTimeFormat-datetimestyle",
  "Intl.DateTimeFormat-dayPeriod",
  "Intl.DateTimeFormat-extend-timezonename",
  "Intl.DateTimeFormat-fractionalSecondDigits",
  "Intl.DateTimeFormat-formatRange",
  "Intl.DisplayNames",
  "Intl.DisplayNames-v2",
  "Intl.ListFormat",
  "Intl.Locale",
  "Intl.Locale-info",
  "Intl.NumberFormat-unified",
  "Intl.NumberFormat-v3",
  "Intl.RelativeTimeFormat",
  "Intl.Segmenter",
  "IsHTMLDDA",
  "import.meta",
  "intl-normative-optional",
  "json-modules",
  "json-superset",
  "legacy-regexp",
  "let",
  "logical-assignment-operators",
  "Map",
  "new.target",
  "numeric-separator-literal",
  "Object.fromEntries",
  "Object.hasOwn",
  "Object.is",
  "object-rest",
  "object-spread",
  "optional-catch-binding",
  "optional-chaining",
  "Promise",
  "Promise.allSettled",
  "Promise.any",
  "Promise.prototype.finally",
  "Proxy",
  "proxy-missing-checks",
  "Reflect",
  "Reflect.construct",
  "Reflect.set",
  "Reflect.setPrototypeOf",
  "regexp-dotall",
  "regexp-lookbehind",
  "regexp-named-groups",
  "regexp-unicode-property-escapes",
  "resizable-arraybuffer",
  "rest-parameters",
  "ShadowRealm",
  "SharedArrayBuffer",
  "Set",
  "String.fromCodePoint",
  "String.prototype.at",
  "String.prototype.endsWith",
  "String.prototype.includes",
  "String.prototype.item",
  "String.prototype.matchAll",
  "String.prototype.replaceAll",
  "String.prototype.trimEnd",
  "String.prototype.trimStart",
  "string-trimming",
  "super",
  "Symbol",
  "Symbol.asyncIterator",
  "Symbol.hasInstance",
  "Symbol.isConcatSpreadable",
  "Symbol.iterator",
  "Symbol.match",
  "Symbol.matchAll",
  "Symbol.prototype.description",
  "Symbol.replace",
  "Symbol.search",
  "Symbol.split",
  "Symbol.species",
  "Symbol.toPrimitive",
  "Symbol.toStringTag",
  "Symbol.unscopables",
  "tail-call-optimization",
  "template",
  "top-level-await",
  "Temporal",
  "TypedArray",
  "TypedArray.prototype.at",
  "TypedArray.prototype.item",
  "u180e",
  "Uint8Array",
  "Uint8ClampedArray",
  "Uint16Array",
  "Uint32Array",
  "WeakMap",
  "WeakSet",
  "WeakRef",
  "well-formed-json-stringify",
]);

const ignoredTests = ["built-ins/RegExp/", "language/literals/regexp/"];

const featuresToPlugins = new Map([["import-assertions", "importAssertions"]]);

const unmappedFeatures = new Set();

function* getPlugins(features) {
  if (!features) return;

  for (const f of features) {
    if (featuresToPlugins.has(f)) {
      yield featuresToPlugins.get(f);
    } else if (!ignoredFeatures.has(f)) {
      unmappedFeatures.add(f);
    }
  }
}

const runner = new TestRunner({
  testDir: path.join(dirname, "../../../build/test262"),
  allowlist: path.join(dirname, "allowlist.txt"),
  logInterval: 500,
  shouldUpdate: process.argv.includes("--update-allowlist"),

  async *getTests() {
    const stream = new TestStream(this.testDir, {
      omitRuntime: true,
    });

    for await (const test of stream) {
      // strip test/
      const fileName = test.file.substr(5);

      if (ignoredTests.some(start => fileName.startsWith(start))) continue;

      yield {
        contents: test.contents,
        fileName,
        id: `${fileName}(${test.scenario})`,
        sourceType: test.attrs.flags.module ? "module" : "script",
        plugins: Array.from(getPlugins(test.attrs.features)),
        expectedError:
          !!test.attrs.negative &&
          (test.attrs.negative.phase === "parse" ||
            test.attrs.negative.phase === "early"),
      };
    }
  },
});

runner
  .run()
  .then(() => {
    if (unmappedFeatures.size) {
      console.warn("");
      console.warn(
        "The following Features are not currently mapped or ignored:"
      );
      console.warn(
        Array.from(unmappedFeatures).join("\n").replace(/^/gm, "   ")
      );

      process.exitCode = 1;
    }
  })
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
