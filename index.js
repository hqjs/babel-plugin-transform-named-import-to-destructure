module.exports = function({ types: t }) {
  const objectKeys = t.memberExpression(
    t.identifier('Object'),
    t.identifier('keys')
  );
  const length = t.identifier('length');
  const one = t.numericLiteral(1);
  return {
    visitor: {
      ImportDeclaration(nodePath) {
        const { specifiers } = nodePath.node;
        const namedSpec = specifiers.filter(s => t.isImportSpecifier(s));
        if (namedSpec.length === 0) return;
        const name = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');
        const exportDefault = t.memberExpression(
          name,
          t.identifier('default')
        );
        const dest = t.variableDeclaration(
          'const',
          [ t.variableDeclarator(
            t.objectPattern(namedSpec
              .map(({ imported, local }) =>
                t.objectProperty(imported, local, false, imported.name === local.name))),
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
            ),
          ) ],
        );
        nodePath.node.specifiers = [ t.ImportNamespaceSpecifier(name) ];
        nodePath.insertAfter(dest);
      },
    },
  };
};
