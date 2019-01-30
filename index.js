module.exports = function({ types: t }) {
  const objectKeys = t.memberExpression(
    t.identifier('Object'),
    t.identifier('keys')
  );
  const length = t.identifier('length');
  const one = t.numericLiteral(1);
  return {
    visitor: {
      ImportDeclaration(nodePath, state) {
        const { baseURI = '', map = '' } = state.opts;
        const { filename = '' } = state.file.opts;
        const { specifiers, source } = nodePath.node;
        if (specifiers.length === 0) return;
        const name = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');
        const exportDefault = t.memberExpression(
          name,
          t.identifier('default')
        );
        const modName = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');
        const dest = t.variableDeclaration(
          'let',
          specifiers.map(({ local }) => t.variableDeclarator(local)).concat(t.variableDeclarator(modName))
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
                      [ name ]
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
          ...specifiers.map(spec => t.expressionStatement(t.assignmentExpression(
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
                        [t.stringLiteral(`Unable to resolve cyclic dependencies between module "${baseURI}${filename}${map}" and "${source.value}${map}" while requesting "${specifiers.map(s => s.imported ? s.imported.name : t.isImportNamespaceSpecifier(s) ? '*' : 'default').join('", ')}". Try to change imports order in a parent module`)]
                      ),
                    ),
                  ]
                )),
            ])
          )
        );
        nodePath.node.specifiers = [ t.ImportNamespaceSpecifier(name) ];
        nodePath.insertAfter(decl);
        nodePath.insertAfter(dest);
      },
    },
  };
};
