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
  const rootNodes = items.filter((item) => !item.parents?.some((id) => itemMap.has(id)));
  return rootNodes.map(buildNode);
};

export const TreeView: FactoryComponent<
  { data: TreeNode | Array<Hierarchical & Labelled>; rootLabel?: string; onselect?: (id: ID) => void } & Attributes
> = () => {
  let treeData: TreeNode[];

  return {
    view: ({ attrs: { data, rootLabel, onselect } }) => {
      if (Array.isArray(data)) {
        treeData = [
          {
            id: '__taxonomy_root__',
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
        selectionMode: 'single',
        onselection: ([id]) => {
          if (id && id !== '__taxonomy_root__') onselect?.(id);
        },
        showConnectors: false,
      });
    },
  };
};
