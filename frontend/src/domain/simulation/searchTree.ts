import type { SearchTreeNode, TreeGenerationLevel } from "../types";

export interface SearchTreeIndex {
  byId: Map<number, SearchTreeNode>;
  childrenByParent: Map<number, SearchTreeNode[]>;
}

export function buildSearchTreeIndex(nodes: SearchTreeNode[]): SearchTreeIndex {
  const byId = new Map<number, SearchTreeNode>();
  const childrenByParent = new Map<number, SearchTreeNode[]>();

  for (const node of nodes) {
    byId.set(node.node_id, node);
    if (node.parent_id <= 0) continue;
    const siblings = childrenByParent.get(node.parent_id) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent_id, siblings);
  }

  for (const [, children] of childrenByParent) {
    children.sort((a, b) => a.node_id - b.node_id);
  }

  return { byId, childrenByParent };
}

export function getNodeNeighborhood(
  nodes: SearchTreeNode[],
  selectedId: number,
  depth = 2,
): TreeGenerationLevel[] {
  const { byId, childrenByParent } = buildSearchTreeIndex(nodes);
  const selected = byId.get(selectedId);
  if (!selected) return [];

  const levels: TreeGenerationLevel[] = [];

  for (let offset = -depth; offset <= depth; offset += 1) {
    const generationNodes = collectGeneration(selectedId, offset, byId, childrenByParent);
    levels.push({
      offset,
      label: generationLabel(offset),
      nodes: generationNodes,
    });
  }

  return levels;
}

function collectGeneration(
  selectedId: number,
  offset: number,
  byId: Map<number, SearchTreeNode>,
  childrenByParent: Map<number, SearchTreeNode[]>,
): SearchTreeNode[] {
  if (offset === 0) {
    const node = byId.get(selectedId);
    return node ? [node] : [];
  }

  if (offset < 0) {
    let frontier = [byId.get(selectedId)!].filter(Boolean);
    for (let step = 0; step < Math.abs(offset); step += 1) {
      frontier = frontier
        .flatMap((node) => (node.parent_id > 0 ? [byId.get(node.parent_id)!] : []))
        .filter(Boolean);
    }
    return dedupeById(frontier);
  }

  let frontier = [byId.get(selectedId)!].filter(Boolean);
  for (let step = 0; step < offset; step += 1) {
    frontier = frontier.flatMap((node) => childrenByParent.get(node.node_id) ?? []);
  }
  return dedupeById(frontier);
}

function dedupeById(nodes: SearchTreeNode[]): SearchTreeNode[] {
  const seen = new Set<number>();
  return nodes.filter((node) => {
    if (seen.has(node.node_id)) return false;
    seen.add(node.node_id);
    return true;
  });
}

function generationLabel(offset: number): string {
  if (offset === 0) return "Selected";
  if (offset === -1) return "Parents";
  if (offset === -2) return "Grandparents";
  if (offset === 1) return "Children";
  if (offset === 2) return "Grandchildren";
  return offset < 0 ? `${Math.abs(offset)} up` : `${offset} down`;
}

export function statusColor(status: string): "default" | "info" | "success" | "warning" | "error" {
  switch (status) {
    case "open":
      return "info";
    case "active":
      return "warning";
    case "dead":
      return "error";
    case "expanded":
      return "success";
    default:
      return "default";
  }
}
