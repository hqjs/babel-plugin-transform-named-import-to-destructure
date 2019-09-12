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

module.exports = function ({ types: t }) {
  const objectKeys = t.memberExpression(
    t.identifier('Object'),
    t.identifier('keys')
  );
  const length = t.identifier('length');
  const one = t.numericLiteral(1);
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
          const importSpecifiers = specifiers.filter(({ local }) => {
            const binding = nodePath.scope.getBinding(local.name);
            return !binding ||
              !isImportTypeOnly({
                binding,
                jsxPragma: fileJsxPragma || jsxPragma,
              });
          });

          if (importSpecifiers.length === 0) return;
          const name = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');
          const exportDefault = t.memberExpression(
            name,
            t.identifier('default')
          );
          const modName = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');
          const dest = t.variableDeclaration(
            'let',
            importSpecifiers.map(({ local }) => t.variableDeclarator(local)).concat(t.variableDeclarator(modName))
          );
          const importAssignment = t.blockStatement([
            t.expressionStatement(t.assignmentExpression(
              '=',
              modName,
              t.conditionalExpression(
                t.logicalExpression(
                  '&&',
                  t.binaryExpression(
                    '===',
                    t.memberExpression(
                      t.callExpression(
                        objectKeys,
                        [name]
                      ),
                      length
                    ),
                    one
                  ),
                  exportDefault
                ),
                exportDefault,
                name
              )
            )),
            ...importSpecifiers.map(spec => t.expressionStatement(t.assignmentExpression(
              '=',
              spec.local,
              spec.imported ?
                t.memberExpression(modName, spec.imported) :
                t.isImportNamespaceSpecifier(spec) ?
                  name :
                  modName
            ))),
          ]);
          const decl = t.tryStatement(
            importAssignment,
            t.catchClause(
              null,
              t.blockStatement([
                t.expressionStatement(t.callExpression(
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
                        [t.stringLiteral(`Unable to resolve cyclic dependencies between module "${baseURI}${filename}${map}" and "${source.value.replace(baseURI, '')}${map}" while requesting "${importSpecifiers.map(s => s.imported ? s.imported.name : t.isImportNamespaceSpecifier(s) ? '*' : 'default').join('", ')}". Try to change imports order in a parent module`)]
                      ),
                    ),
                  ]
                )),
              ])
            )
          );
          nodePath.node.specifiers = [t.ImportNamespaceSpecifier(name)];
          nodePath.insertAfter(decl);
          nodePath.insertAfter(dest);
        }
      },
    },
  };
};
