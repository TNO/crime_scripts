import m, { FactoryComponent, Attributes } from 'mithril';

export interface TreeNode {
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
}

export const TreeView: FactoryComponent<{ data: TreeNode } & Attributes> = () => {
  // Recursive function to toggle node expansion
  const toggleNode = (node: TreeNode) => {
    node.expanded = !node.expanded;
  };

  // Recursive function to render tree nodes
  const renderNode = (node: TreeNode, level: number = 0): m.Vnode => {
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 20; // Pixels per level of indentation

    return m('.tree-node', { style: { marginLeft: `${indent}px` } }, [
      m(
        '.node-content',
        {
          onclick: (e: Event) => {
            e.stopPropagation(); // Prevent event bubbling
            if (hasChildren) {
              toggleNode(node);
            }
          },
        },
        [
          // Toggle icon
          hasChildren &&
            m(
              'span.toggle-icon',
              {
                style: { cursor: 'pointer', marginRight: '8px' },
              },
              node.expanded ? '▼' : '▶'
            ),

          // Node name
          m(
            'span.node-name',
            {
              style: {
                cursor: hasChildren ? 'pointer' : 'default',
              },
            },
            node.label
          ),
        ]
      ),

      // Render children if expanded
      node.expanded &&
        hasChildren &&
        m(
          '.node-children',
          node.children!.map((child) => renderNode(child, level + 1))
        ),
    ]);
  };

  return {
    view: ({ attrs: { data, ...attrs } }) =>
      m(
        '.tree-view',
        {
          ...attrs,
          style: {
            fontFamily: 'Arial, sans-serif',
            padding: '1rem',
          },
        },
        renderNode(data)
      ),
  };
};
