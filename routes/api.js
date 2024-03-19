'use strict';

const { Board } = require('../models');

const BoardModel = require('../models').Board;
const ThreadModel = require('../models').Thread;
const ReplyModel = require('../models').Reply;

module.exports = function (app) {
  
  app.route('/api/threads/:board').post((req, res) => {
    const { text, delete_password } = req.body;
    let board = req.body.board || req.params.board;
    console.log("post", req.body);
    const newThread = new ThreadModel({
        text: text,
        delete_password: delete_password,
        replies: []
    });
    BoardModel.findOne({ name: board })
        .then(boardData => {
            if (!boardData) {
                // Create a new board if it doesn't exist
                const newBoard = new BoardModel({
                    name: board,
                    threads: []
                });
                newBoard.threads.push(newThread);
                newBoard.save()
                    .then(savedBoard => {
                        res.json(newThread);
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).send("Error saving post");
                    });
            } else {
                // Board exists, add thread to it
                boardData.threads.push(newThread);
                boardData.save()
                    .then(savedBoard => {
                        res.json(newThread);
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).send("Error saving post");
                    });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Error finding board");
        });
    });
  
  app.route('/api/threads/:board').get((req, res) => {
    const board = req.params.board;
    BoardModel.findOne({ name: board })
        .then(boardData => {
            if (!boardData) {
                res.status(404).send("Board not found");
            } else {
                const threads = boardData.threads.map(thread => {
                    return {
                        _id: thread._id,
                        text: thread.text,
                        created_on: thread.created_on,
                        bumped_on: thread.bumped_on,
                        reported: thread.reported,
                        delete_password: thread.delete_password,
                        replies: thread.replies,
                        replycount: thread.replies.length
                    };
                });
                res.json(threads);
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).send("Error finding board");
        });
    });
};
