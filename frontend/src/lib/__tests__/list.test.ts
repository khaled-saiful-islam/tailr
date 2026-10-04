import { move, moveById, removeById, updateById } from "../list";

const items = [
  { id: "a", n: 1 },
  { id: "b", n: 2 },
  { id: "c", n: 3 },
];

describe("list helpers", () => {
  it("update and remove without mutating", () => {
    const updated = updateById(items, "b", { n: 20 });
    expect(updated[1]).toEqual({ id: "b", n: 20 });
    expect(items[1]!.n).toBe(2);
    expect(removeById(items, "a").map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("moves within bounds only", () => {
    expect(move(items, 0, 2).map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(moveById(items, "a", -1).map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(moveById(items, "c", -1).map((i) => i.id)).toEqual(["a", "c", "b"]);
  });
});
