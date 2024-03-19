'use strict';
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

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

    app.route('/api/threads/:board').put((req, res) => {
        console.log("put", req.body);
        const { report_id } = req.body;
        const board = req.params.board;
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    res.status(404).send("Board not found");
                } else {
                    const date = new Date();
                    let reportedThread = boardData.threads.id(report_id);
                    reportedThread.reported = true;
                    reportedThread.bumped_on = date;
                    boardData.save()
                        .then(updatedData => {
                            res.send("Success");
                        })
                        .catch(err => {
                            console.error(err);
                            res.status(500).send("Error updating data");
                        });
                }
            })
            .catch(err => {
                console.error(err);
                res.status(500).send("Error finding board");
            });
    });

    app.route('/api/threads/:board').delete((req, res) => {
        console.log("delete", req.body);
        const { thread_id, delete_password } = req.body;
        const board = req.params.board;
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    res.status(404).send("Board not found");
                } else {
                    let threadToDelete = boardData.threads.id(thread_id);
                    if (threadToDelete.delete_password === delete_password) {
                        boardData.threads.pull(thread_id);
                    } else {
                        res.send("Incorrect password");
                        return;
                    }
                    boardData.save()
                        .then(updatedData => {
                            res.send("Success");
                        });
                    }
                })
                        .catch(err => {
                            console.log(err);
                            res.status(500).send("Error updating data");
                        }); 
    });
    
    app.route('/api/replies/:board').post((req, res) => {
        console.log("1");
        console.log("thread", req.body);
        const { thread_id, text, delete_password } = req.body;
        const board = req.params.board;
        const newReply = new ReplyModel({
            text: text,
            delete_password: delete_password
        });
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    res.status(404).send("Board not found");
                } else {
                    const date = new Date();
                    let threadToAddReply = boardData.threads.id(thread_id);
                    threadToAddReply.bumped_on = date;
                    threadToAddReply.replies.push(newReply);
                    boardData.save()
                        .then(updatedData => {
                            res.json(updatedData.threads.id(thread_id));
                        });
                }
            })
        });
        
    app.route('/api/replies/:board').get((req, res) => {
        const board = req.params.board;
        BoardModel.findOne( { name: board })
            .then(boardData => {
                if (!boardData) {
                    res.status(404).send("Board not found");
                    res.json({ error: "No board with this name"});
                } else {
                    console.log("data", boardData);
                    const thread = boardData.threads.id(req.query.thread_id);
                    res.json(thread);
                }
                });
            });
    
    app.route('/api/replies/:board').put((req, res) => {
        const {thread_id, reply_id } = req.body;
        const board = req.params.board;
        BoardModel.findOne( { name: board })
            .then(boardData => {
                if ( !boardData) {
                    res.status(404).send("Board not found");
                } else {
                    console.log("data", boardData);
                    let thread = boardData.threads.id(thread_id);
                    let reply = thread.replies.id(reply_id);
                    reply.reported = true;
                    reply.bumped_on = new Date();
                    boardData.save()
                        .then(updatedData => {
                            res.send("Success");
                        });
                }
                });
            });
    
    app.route('/api/replies/:board').delete((req, res) => {
        const { thread_id, reply_id, delete_password } = req.body;
        console.log("delete reply body", req.body);
        const board = req.params.board;
        BoardModel.findOne( { name: board })
            .then(boardData => {
                if ( !boardData) {
                    res.status(404).send("Board not found");
                } else {
                    console.log("data", boardData);
                    let thread = boardData.threads.id(thread_id);
                    let reply = thread.replies.id(reply_id);
                    if (reply.delete_password === delete_password) {
                        thread.replies.pull(reply_id);
                    } else {
                        res.send("Incorrect password");
                        return;
                    }
                    boardData.save()
                        .then(updatedData => {
                            res.send("Success");
                        });
                }
                });
            });
};
