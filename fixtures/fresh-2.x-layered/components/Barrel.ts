// DEFECT (I005): barrel that re-exports an island. routes/barrel-user.tsx
// consumes LikeButton through this file instead of importing the island directly.
export { default as LikeButton } from "../islands/LikeButton.tsx";
