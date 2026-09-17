import m, { type Attributes, type FactoryComponent } from 'mithril';
import { TreeView as MMTreeView, type TreeNode } from 'mithril-materialized';
import type { Hierarchical, ID, Labelled } from '../../models';

const buildTreeFromHierarchy = (items: (Labelled & Hierarchical)[]): TreeNode[] => {
  // Create a map for quick item lookup
  const itemMap = new Map<ID, Labelled & Hierarchical>();
  items.forEach((item) => itemMap.set(item.id, item));

  // Create a map to store child-parent relationships
  const childrenMap = new Map<ID, Set<ID>>();

  // Build the children map
  items.forEach((item) => {
    if (item.parents && item.parents.length > 0) {
      item.parents.forEach((parentId) => {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, new Set<ID>());
        }
        childrenMap.get(parentId)!.add(item.id);
      });
    }
  });

  // Helper function to recursively build tree nodes
  const buildNode = (item: Labelled & Hierarchical): TreeNode => {
    const node: TreeNode = {
      id: item.id,
      label: item.label,
      expanded: true,
      // data: item,
    };

    // Get children for this node
    const childrenIds = childrenMap.get(item.id);
    if (childrenIds && childrenIds.size > 0) {
      node.children = Array.from(childrenIds)
        .map((childId) => itemMap.get(childId))
        .filter((child): child is Labelled & Hierarchical => child !== undefined)
        .map(buildNode);
    }

    return node;
  };

  // Find root nodes (items with no parents) and build trees
  const rootNodes = items.filter((item) => !item.parents || item.parents.length === 0);
  return rootNodes.map(buildNode);
};

export const TreeView: FactoryComponent<
  { data: TreeNode | Array<Hierarchical & Labelled>; rootLabel?: string } & Attributes
> = () => {
  let treeData: TreeNode[];

  // Recursive function to toggle node expansion
  const toggleNode = (node: TreeNode) => {
    node.expanded = !node.expanded;
  };

  // Recursive function to render tree nodes
  const renderNode = (node: TreeNode, level: number = 0): m.Vnode => {
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 6; // Pixels per level of indentation

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
          hasChildren
            ? m(
                'span.toggle-icon',
                {
                  style: { cursor: 'pointer', marginRight: '4px' },
                },
                node.expanded ? '▼' : '▶'
              )
            : m('span.toggle-icon', { style: { marginRight: '4px' } }, '▪'),

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
    view: ({ attrs: { data, rootLabel } }) => {
      if (Array.isArray(data)) {
        treeData = [
          {
            label: rootLabel || 'Root',
            expanded: true,
            children: buildTreeFromHierarchy(data),
          } as TreeNode,
        ];
      } else {
        treeData = JSON.parse(JSON.stringify(data));
      }
      return m(MMTreeView, {
        data: treeData,
        iconType: 'caret',
        selectionMode: 'none',
        showConnectors: false,
      });
    },
  };
};
