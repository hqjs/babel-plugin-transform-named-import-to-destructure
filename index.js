module.exports = function({ types: t }) {
  return {
    visitor: {
      ImportDeclaration(nodePath) {
        const { specifiers } = nodePath.node;
        const namedSpec = specifiers.filter(s => t.isImportSpecifier(s));
        if (namedSpec.length === 0) return;
        const name = nodePath.scope.generateUidIdentifierBasedOnNode('destructure');
        const dest = t.variableDeclaration(
          'const',
          [ t.variableDeclarator(
            t.objectPattern(namedSpec
              .map(({ imported, local }) =>
                t.objectProperty(imported, local, false, imported.name === local.name))),
            t.logicalExpression(
              '||',
              t.memberExpression(
                name,
                t.identifier('default')
              ),
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
