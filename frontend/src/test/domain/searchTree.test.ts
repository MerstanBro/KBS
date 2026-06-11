import { describe, expect, it } from "vitest";
import { buildSearchTreeIndex, getNodeNeighborhood } from "../../domain/simulation/searchTree";
import type { SearchTreeNode } from "../../domain/types";

const sampleTree: SearchTreeNode[] = [
  {
    node_id: 1,
    parent_id: 0,
    robot_x: 3,
    robot_y: 1,
    robot_state: "collect",
    status: "expanded",
    g_n: 0,
    f_n: 22,
    last_action: "start",
  },
  {
    node_id: 2,
    parent_id: 1,
    robot_x: 3,
    robot_y: 2,
    robot_state: "load",
    status: "expanded",
    g_n: 1,
    f_n: 23,
    last_action: "warehouse",
  },
  {
    node_id: 3,
    parent_id: 2,
    robot_x: 3,
    robot_y: 2,
    robot_state: "load",
    status: "open",
    g_n: 1,
    f_n: 23,
    last_action: "load red",
  },
  {
    node_id: 4,
    parent_id: 2,
    robot_x: 3,
    robot_y: 2,
    robot_state: "load",
    status: "open",
    g_n: 1,
    f_n: 24,
    last_action: "load pink",
  },
];

describe("searchTree", () => {
  it("indexes children by parent id", () => {
    const index = buildSearchTreeIndex(sampleTree);
    expect(index.childrenByParent.get(2)?.map((node) => node.node_id)).toEqual([3, 4]);
  });

  it("returns two generations up and down", () => {
    const levels = getNodeNeighborhood(sampleTree, 3, 2);
    expect(levels).toHaveLength(5);
    expect(levels.find((level) => level.offset === 0)?.nodes[0]?.node_id).toBe(3);
    expect(levels.find((level) => level.offset === -1)?.nodes[0]?.node_id).toBe(2);
    expect(levels.find((level) => level.offset === -2)?.nodes[0]?.node_id).toBe(1);
    expect(levels.find((level) => level.offset === 1)?.nodes).toHaveLength(0);
  });
});
