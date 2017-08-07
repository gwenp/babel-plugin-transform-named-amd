"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = function (_ref) {
  var t = _ref.types;

  function isValidRequireCall(path) {
    if (!path.isCallExpression()) return false;
    if (!path.get("callee").isIdentifier({ name: "require" })) return false;
    if (path.scope.getBinding("require")) return false;

    var args = path.get("arguments");
    if (args.length !== 1) return false;

    var arg = args[0];
    if (!arg.isStringLiteral()) return false;

    return true;
  }

  function buildParamsAndSource(sourcesFound) {
    var params = [];
    var sources = [];

    var hasSeenNonBareRequire = false;
    for (var i = sourcesFound.length - 1; i > -1; i--) {
      var source = sourcesFound[i];

      sources.unshift(source[1]);

      // bare import at end, no need for param
      if (!hasSeenNonBareRequire && source[2] === true) {
        continue;
      }

      hasSeenNonBareRequire = true;
      params.unshift(source[0]);
    }

    return [params, sources];
  }

  var amdVisitor = {
    ReferencedIdentifier: function ReferencedIdentifier(_ref2) {
      var node = _ref2.node,
          scope = _ref2.scope;

      if (node.name === "exports" && !scope.getBinding("exports")) {
        this.hasExports = true;
      }

      if (node.name === "module" && !scope.getBinding("module")) {
        this.hasModule = true;
      }
    },
    CallExpression: function CallExpression(path) {
      if (!isValidRequireCall(path)) return;
      var source = path.node.arguments[0];
      var ref = path.scope.generateUidIdentifier((0, _path.basename)(source.value, (0, _path.extname)(source.value)));
      this.sources.push([ref, source, true]);
      path.remove();
    },
    VariableDeclarator: function VariableDeclarator(path) {
      var id = path.get("id");
      if (!id.isIdentifier()) return;

      var init = path.get("init");
      if (!isValidRequireCall(init)) return;

      var source = init.node.arguments[0];
      this.sourceNames[source.value] = true;
      this.sources.push([id.node, source]);

      path.remove();
    }
  };

  return {
    inherits: _babelPluginTransformEs2015ModulesCommonjs2.default,

    pre: function pre() {
      // source strings
      this.sources = [];
      this.sourceNames = Object.create(null);

      this.hasExports = false;
      this.hasModule = false;
    },


    visitor: {
      Program: {
        exit: function exit(path) {
          if (this.ran) return;
          this.ran = true;

          path.traverse(amdVisitor, this);

          var _buildParamsAndSource = buildParamsAndSource(this.sources),
              _buildParamsAndSource2 = _slicedToArray(_buildParamsAndSource, 2),
              params = _buildParamsAndSource2[0],
              sources = _buildParamsAndSource2[1];

          var moduleName = this.file.opts.filename.replace(/\.[^/.]+$/, "");
          moduleName = moduleName.split('/');
          moduleName.shift();
          moduleName = moduleName.join('/');

          if (moduleName) moduleName = t.stringLiteral(moduleName);

          if (this.hasExports) {
            sources.unshift(t.stringLiteral("exports"));
            params.unshift(t.identifier("exports"));
          }

          if (this.hasModule) {
            sources.unshift(t.stringLiteral("module"));
            params.unshift(t.identifier("module"));
          }

          var node = path.node;

          var factory = buildFactory({
            PARAMS: params,
            BODY: node.body
          });
          factory.expression.body.directives = node.directives;
          node.directives = [];

          node.body = [buildDefine({
            MODULE_NAME: moduleName,
            SOURCES: sources,
            FACTORY: factory
          })];
        }
      }
    }
  };
};

var _path = require("path");

var _babelTemplate = require("babel-template");

var _babelTemplate2 = _interopRequireDefault(_babelTemplate);

var _babelPluginTransformEs2015ModulesCommonjs = require("babel-plugin-transform-es2015-modules-commonjs");

var _babelPluginTransformEs2015ModulesCommonjs2 = _interopRequireDefault(_babelPluginTransformEs2015ModulesCommonjs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildDefine = (0, _babelTemplate2.default)("\n  define(MODULE_NAME, [SOURCES], FACTORY);\n");

var buildFactory = (0, _babelTemplate2.default)("\n  (function (PARAMS) {\n    BODY;\n  })\n");