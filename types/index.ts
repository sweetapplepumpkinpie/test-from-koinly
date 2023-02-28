export enum Mark {
  CIRCLE = "circle",
  X = "x-lg",
}
export interface IGameData {
  winner: string | null
  turn: string | null
  opposite: string | null
  users: string[]
  grid: number[]
}
export interface IGameStatus {
  col: number
  row: number
  turn?: string
}
