import { NextApiRequest } from "next"
import { Server, Socket } from "net"
import { NextApiResponse } from "next"
import { Server as SocketIOServer } from "socket.io"
import { Server as NetServer } from "http"
import { Server as ServerIO } from "socket.io"

import { IGameData, IGameStatus } from "@/types"

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: Server & {
      io: SocketIOServer
    }
  }
}

let mark = 1
const gameData: IGameData = {
  winner: null,
  turn: null,
  opposite: null,
  users: [],
  grid: Array.from<number>({ length: 9 }).fill(0),
}
const positionsCanWin = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 4, 8],
  [2, 4, 6],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
]

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    // adapt Next's net Server to http Server
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: "/api/socketio",
    })

    // append SocketIO server to Next.js socket server response
    res.socket.server.io = io
    io.on("connection", (socket) => {
      const id = socket.id

      if (!gameData.turn) {
        gameData.turn = id
      } else if (!gameData.opposite) {
        gameData.opposite = id
      }

      if (!gameData.users.length || !gameData.users.includes(id)) {
        gameData.users.push(id)
      }

      const sendGameData = () => {
        io.sockets.emit("gameData", gameData)
      }

      const reset = () => {
        gameData.winner = null
        gameData.grid = Array.from<number>({ length: 9 }).fill(0)
        sendGameData()
      }

      sendGameData()

      const isWinner = (mark: number): boolean => {
        return positionsCanWin.some(
          (positions) =>
            mark === gameData.grid[positions[0]] &&
            gameData.grid[positions[0]] === gameData.grid[positions[1]] &&
            gameData.grid[positions[1]] === gameData.grid[positions[2]]
        )
      }

      socket.on("updateStatus", ({ row, col, turn }: IGameStatus) => {
        if (gameData.turn === turn) {
          if (!gameData.grid[row * 3 + col]) {
            ;[gameData.turn, gameData.opposite] = [
              gameData.opposite,
              gameData.turn,
            ]
            if (mark === 1) {
              gameData.grid[row * 3 + col] = 1
              mark = -1
            } else {
              gameData.grid[row * 3 + col] = -1
              mark = 1
            }
            if (isWinner(-mark)) {
              gameData.winner = turn
            }
            sendGameData()
          } else {
            socket.emit("alert", "Can't do that.")
          }
        } else {
          socket.emit("alert", "Not your turn.")
        }
      })

      socket.on("wantToReset", () => {
        const user = socket.id
      })

      socket.on("reset", () => {
        reset()
      })

      socket.on("disconnect", () => {
        const id = socket.id

        gameData.users = gameData.users.filter((user) => user !== id)

        if (gameData.turn === id) {
          gameData.turn = null
        }
        if (gameData.opposite === id) {
          gameData.opposite = null
        }
      })
    })
  }
  res.end()
}
