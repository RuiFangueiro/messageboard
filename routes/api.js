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
        const board = req.params.board;
    
        // Create a new Date object to represent the current date & time
        const currentDate = new Date();
    
        const newThread = new ThreadModel({
            text: text,
            delete_password: delete_password,
            created_on: currentDate, // Set created_on to the current date & time
            bumped_on: currentDate, // Set bumped_on to the current date & time
            reported: false, // Initially set reported to false
            replies: [] // Initialize replies array as empty
        });
    
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    // Create a new board if it doesn't exist
                    const newBoard = new BoardModel({
                        name: board,
                        threads: [newThread]
                    });
                    return newBoard.save();
                } else {
                    // Board exists, add thread to it
                    boardData.threads.unshift(newThread); // Add newThread to the beginning of the threads array
                    return boardData.save();
                }
            })
            .then(savedData => {
                if (!savedData) {
                    throw new Error("Error saving thread");
                }
                res.json(newThread); // Respond with the newly created thread
            })
            .catch(err => {
                console.error(err);
                res.status(500).send("Error saving thread");
            });
    });

  app.route('/api/threads/:board').get((req, res) => {
    const board = req.params.board;
    BoardModel.findOne({ name: board })
        .populate({
            path: 'threads',
            options: { 
                sort: { bumped_on: -1 }, // Sort by bumped_on field in descending order
                limit: 10, // Limit to 10 threads
                populate: { // Populate the replies field
                    path: 'replies',
                    options: { 
                        sort: { created_on: -1 }, // Sort replies by created_on field in descending order
                        limit: 3 // Limit to 3 replies
                    },
                    select: '-reported -delete_password' // Exclude reported and delete_password fields
                },
                select: '-reported -delete_password' // Exclude reported and delete_password fields
            }
        })
        .then(boardData => {
            if (!boardData) {
                res.status(404).send("Board not found");
            } else {
                const threads = boardData.threads.slice(0, 10).map(thread => {
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
        const { thread_id } = req.body;
        const board = req.params.board;
        
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    return res.status(404).send("Board not found");
                }
                
                const date = new Date();
                const threadToUpdate = boardData.threads.id(thread_id);
                
                if (!threadToUpdate) {
                    return res.status(404).send("Thread not found");
                }
                
                threadToUpdate.reported = true;
                threadToUpdate.bumped_on = date;
                
                return boardData.save();
            })
            .then(updatedData => {
                if (!updatedData) {
                    return res.status(500).send("Error updating thread");
                }
                
                res.send("reported");
            })
            .catch(err => {
                console.error(err);
                res.status(500).send("Error updating data");
            });
    });

    app.route('/api/threads/:board').delete((req, res) => {
        const { thread_id, delete_password } = req.body;
        const board = req.params.board;
    
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    return res.status(404).send("Board not found");
                }
                
                const threadToDelete = boardData.threads.id(thread_id);
                if (!threadToDelete) {
                    return res.status(404).send("Thread not found");
                }
                
                if (threadToDelete.delete_password !== delete_password) {
                    return res.send("incorrect password");
                }
                
                // Remove the thread from the board's threads array
                boardData.threads.pull(thread_id);
                
                return boardData.save();
            })
            .then(updatedData => {
                if (!updatedData) {
                    throw new Error("Error updating board");
                }
                
                if (!res.headersSent) {
                    return res.send("success");
                    }
            })
            .catch(err => {
                console.error(err);
                if (!res.headersSent) {
                    res.status(500).send("Error deleting thread");
                }
            });
    });

    app.route('/api/replies/:board').post((req, res) => {
        const { text, delete_password, thread_id } = req.body;
        const board = req.params.board;
    
        // Validate that thread_id is provided
        if (!thread_id) {
            return res.status(400).send("Thread ID is required");
        }
    
        BoardModel.findOne({ name: board })
            .then(boardData => {
                if (!boardData) {
                    return res.status(404).send("Board not found");
                }
    
                const threadToAddReply = boardData.threads.id(thread_id);
                if (!threadToAddReply) {
                    return res.status(404).send("Thread not found");
                }
    
                // Create a new reply
                const newReply = new ReplyModel({
                    text: text,
                    delete_password: delete_password
                });
    
                // Update bumped_on date of the thread to the current date & time
                threadToAddReply.bumped_on = new Date();
                // Push the new reply to the thread's replies array
                threadToAddReply.replies.push(newReply);
    
                return boardData.save();
            })
            .then(updatedData => {
                if (!updatedData) {
                    throw new Error("Error saving reply");
                }
                // Respond with the newly added reply
                res.json(newReply);
            })
            .catch(err => {
                console.error(err);
                res.status(500).send("Error saving reply");
            });
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
                    let thread = boardData.threads.id(thread_id);
                    let reply = thread.replies.id(reply_id);
                    reply.reported = true;
                    reply.bumped_on = new Date();
                    boardData.save()
                        .then(updatedData => {
                            res.send("reported");
                        });
                }
                });
            });

            app.route('/api/replies/:board').delete((req, res) => {
                const { thread_id, reply_id, delete_password } = req.body;
                const board = req.params.board;
            
                BoardModel.findOne({ name: board })
                    .then(boardData => {
                        if (!boardData) {
                            return res.status(404).send("Board not found");
                        }
                        
                        const thread = boardData.threads.id(thread_id);
                        if (!thread) {
                            return res.status(404).send("Thread not found");
                        }
                        
                        const reply = thread.replies.id(reply_id);
                        if (!reply) {
                            return res.status(404).send("Reply not found");
                        }
                        
                        if (reply.delete_password !== delete_password) {
                            return res.send("Incorrect password");
                        }
                        
                        // Update the text of the reply to [deleted]
                        reply.text = "[deleted]";
                        
                        return boardData.save();
                    })
                    .then(updatedData => {
                        if (!updatedData) {
                            return res.status(500).send("Error updating reply");
                        }
                        
                        res.send("success");
                    })
                    .catch(err => {
                        console.error(err);
                        res.status(500).send("Error deleting reply");
                    });
            });       
};
