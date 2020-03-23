const jsxPragma = 'React';
let fileJsxPragma = '';
let sourceFileHasJsx = false;
const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/;

function notConstructorParameterType(nodePath) {
  const paramPropChild = nodePath.parentPath &&
    nodePath.parentPath.parentPath &&
    nodePath.parentPath.parentPath.parentPath
  if (!paramPropChild || !paramPropChild.parent) return true;
  const isParamProp = paramPropChild.parent.type === 'TSParameterProperty';
  if (!isParamProp) return true;
  const classMethod = paramPropChild.parentPath.parent && paramPropChild.parentPath.parent;
  if (!classMethod) return true;
  return !(classMethod.type === 'ClassMethod' && classMethod.kind === 'constructor');
}

function isInType(nodePath) {
  switch (nodePath.parent.type) {
    case 'TSTypeReference':
    case 'TSQualifiedName':
    case 'TSExpressionWithTypeArguments':
    case 'TSTypeQuery':
      return notConstructorParameterType(nodePath);
    default:
      return false;
  }
}

function isImportTypeOnly({ binding, jsxPragma }) {
  for (const nodePath of binding.referencePaths) {
    if (!isInType(nodePath)) {
      return false;
    }
  }

  if (binding.identifier.name !== jsxPragma) {
    return true;
  }

  // "React" or the JSX pragma is referenced as a value if there are any JSX elements in the code.
  return !sourceFileHasJsx;
}

function checkCircular(t, importAssignment, error) {
  return t.tryStatement(
	t.blockStatement([t.expressionStatement(importAssignment)]),
    t.catchClause(null, t.blockStatement([t.expressionStatement(t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('Promise'),
              t.identifier('resolve')
            ),
            []
          ),
          t.identifier('then')
        ),
        [
          t.arrowFunctionExpression(
            [],
            importAssignment
          ),
        ]
      ),
      t.identifier('catch')
    ),
    [
      t.arrowFunctionExpression(
        [],
        t.callExpression(
          t.memberExpression(
            t.identifier('console'),
            t.identifier('error')
          ),
          [error]
        ),
      ),
    ]
  ))]))
  );
}

function destructure(t, spec, importLocalName) {
  const exportDefault = t.memberExpression(
    importLocalName,
    t.identifier('default')
  );

  return t.conditionalExpression(
    t.binaryExpression(
      'in',
      t.StringLiteral(spec.imported.name),
      importLocalName
    ),
    t.memberExpression(importLocalName, spec.imported),
    t.memberExpression(exportDefault, spec.imported)
  );
}

function destructureDefault(t, importLocalName) {
  const exportDefault = t.memberExpression(
    importLocalName,
    t.identifier('default')
  );

  return t.conditionalExpression(
    t.binaryExpression(
      'in',
      t.StringLiteral('default'),
      importLocalName
    ),
    t.memberExpression(importLocalName, t.identifier('default')),
    importLocalName
  );
}

module.exports = function ({ types: t }) {
  return {
    visitor: {
      Program(nodePath, state) {
        const { file } = state;

        if (file.ast.comments) {
          for (const comment of (file.ast.comments)) {
            const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);
            if (jsxMatches) {
              fileJsxPragma = jsxMatches[1];
            }
          }
        }
        nodePath.traverse({
          JSXElement() {
            sourceFileHasJsx = true;
          },
          JSXFragment() {
            sourceFileHasJsx = true;
          },
        });
      },
      ImportDeclaration: {
        exit(nodePath, state) {
          const { baseURI = '', map = '' } = state.opts;
          const { filename = '' } = state.file.opts;
          const { specifiers, source } = nodePath.node;

          const dstName = `${baseURI}${filename}`;
          const srcName = `${baseURI}${source.value}`.replace(new RegExp(`(${baseURI})+`), baseURI);

          const importSpecifiers = specifiers.filter(({ local }) => {
            const binding = nodePath.scope.getBinding(local.name);
            return !binding ||
              !isImportTypeOnly({
                binding,
                jsxPragma: fileJsxPragma || jsxPragma,
              });
          });

          if (importSpecifiers.length === 0) return;

          const modifiedSpecifiers = [];

          const defaultSpecifiers = importSpecifiers.filter(spec => t.isImportDefaultSpecifier(spec));
          if (defaultSpecifiers.length > 0) {
            const importLocalName = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');

            const moduleDeclarations = t.variableDeclaration(
              'let',
              defaultSpecifiers.map(({ local }) => t.variableDeclarator(local))
            );

            const importAssignment = t.sequenceExpression([
              ...defaultSpecifiers.map(spec => t.assignmentExpression(
                '=',
                spec.local,
                destructureDefault(t, importLocalName)
              )),
            ]);
            const error = t.stringLiteral(`Unable to resolve cyclic dependencies between module "${dstName}${map}" and "${srcName}${map}" while requesting "default" as "${defaultSpecifiers.map(s => s.local.name).join('", ')}". Try to import "${dstName}" before "${srcName}" in a parent module`);
            const tryAssignment = checkCircular(t, importAssignment, error);

            modifiedSpecifiers.push(t.importNamespaceSpecifier(importLocalName));
            nodePath.insertAfter(tryAssignment);
            nodePath.insertBefore(moduleDeclarations);
          }

          const destrSpecifiers = importSpecifiers.filter(spec => t.isImportSpecifier(spec));
          if (destrSpecifiers.length > 0) {
            const importLocalName = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');

            const moduleDeclarations = t.variableDeclaration(
              'let',
              destrSpecifiers.map(({ local }) => t.variableDeclarator(local))
            );

            const importAssignment = t.sequenceExpression([
              ...destrSpecifiers.map(spec => t.assignmentExpression(
                '=',
                spec.local,
                destructure(t, spec, importLocalName)
              )),
            ]);
            const error = t.stringLiteral(`Unable to resolve cyclic dependencies between module "${dstName}${map}" and "${srcName}${map}" while requesting "${destrSpecifiers.map(s => s.local.name).join('", ')} as ${destrSpecifiers.map(s => s.imported.name).join('", ')}". Try to import "${dstName}" before "${srcName}" in a parent module`);
            const tryAssignment = checkCircular(t, importAssignment, error);

            modifiedSpecifiers.push(t.importNamespaceSpecifier(importLocalName));
            nodePath.insertAfter(tryAssignment);
            nodePath.insertBefore(moduleDeclarations);
          }

          const namespaceSpecifiers = importSpecifiers.filter(spec => t.isImportNamespaceSpecifier(spec));
          modifiedSpecifiers.push(...namespaceSpecifiers);

          nodePath.node.specifiers = modifiedSpecifiers;
        }
      },
    },
  };
};
