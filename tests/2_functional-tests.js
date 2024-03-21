const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
        chai.request(server)
            .post('/api/threads/test')
            .send({
                text: 'test thread', 
                delete_password: 'test'
            })
            .end(function(err, res){
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, '_id');
                assert.property(res.body, 'text');
                assert.property(res.body, 'created_on');
                assert.property(res.body, 'bumped_on');
                assert.property(res.body, 'replies');
                done();
            });
    });

    //Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}
    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
        chai.request(server)
            .get('/api/threads/test')
            .end(function(err, res){
                assert.equal(res.status, 200);      
                assert.isArray(res.body);
                assert.isAtMost(res.body.length, 10, 'Response has more than 10 threads');
                const thread = res.body[0];
                assert.isObject(thread, 'Thread is not an object');
                assert.property(thread, '_id');
                assert.property(thread, 'text');
                assert.property(thread, 'created_on');
                assert.property(thread, 'bumped_on');
                assert.property(thread, 'replies');
                assert.property(thread, 'replycount');
                assert.isArray(thread.replies, 'Replies is not an array');
                assert.isAtMost(thread.replies.length, 3, 'Thread has more than 3 replies');
                done();
            });
    });

    //Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password
    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function(done) {
        chai.request(server)
            .delete('/api/threads/test')
            .send({
                thread_id: '65fb82cb65ed355db37427c9',
                delete_password: 'wrong_password'
            })
            .end(function(err, res){
                assert.equal(res.status, 200);
                assert.equal(res.text, 'incorrect password');
                done();
            });
    });
    
    //Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password
    test('Deleting a thread with the correct password: Delete request to /api/threads/{board} with a valid delete_password', function(done) {
        chai.request(server)
            .post('/api/threads/test')
            .send({
                text: 'test thread to delete', 
                delete_password: 'test',
            })
            .end(function(err, res) {
                if (err) {
                    return done(err);  // Handle the error
                }
                const thread_id = res.body._id;
                chai.request(server)
                    .delete('/api/threads/test')
                    .send({
                        thread_id: thread_id,
                        delete_password: 'test'
                    })
                    .end(function(err, res) {
                        assert.equal(res.status, 200);
                        assert.equal(res.text, 'success');
                        done();
                    });
            })
    })

    //Reporting a thread: PUT request to /api/threads/{board}
    test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
        chai.request(server)
            .put('/api/threads/test')
            .send({
                board: 'test',
                thread_id: '65fb82cb65ed355db37427c9'
            })
            .end(function(err, res){
                assert.equal(res.status, 200);
                assert.equal(res.text, 'reported');
                done();
            })
    })

    //Creating a new reply: POST request to /api/replies/{board}
    test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
        chai.request(server)
            .post('/api/replies/test')
            .send({
                board: 'test',
                thread_id: '65fc37edf58fe7a939ab6746',
                text: 'test reply', 
                delete_password: 'test'
            })
            .end(function(err, res){
                assert.equal(res.status, 200);
                assert.equal(res.body.text, 'test reply');
                done();
            });
    });

    //Viewing a single thread with all replies: GET request to /api/replies/{board}
    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
        chai.request(server)
            .get('/api/replies/test')
            .query({
                thread_id: '65fc37edf58fe7a939ab6746'
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                done();
            })
        });

    //Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password
    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
        chai.request(server)
            .delete('/api/replies/test')
            .send({
                board: 'test',
                thread_id: '65fc37edf58fe7a939ab6746',
                reply_id: '65fc386dceca1cf3e0aafe7e',
                delete_password: 'wrong_password'
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'Incorrect password');
                done();
            })
    })

    //Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password
    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
        chai.request(server)
            .post('/api/replies/test')
            .send({
                board: 'test',
                thread_id: '65fc37edf58fe7a939ab6746',
                text: 'test reply to delete', 
                delete_password: 'test'
            })
            .end(function(err, resp) {
                if (err) {
                    return done(err);  // Handle the error
                }
                const reply_id = resp.body._id;
                chai.request(server)
                    .delete('/api/replies/test')
                    .send({
                        board: 'test',
                        thread_id: '65fc37edf58fe7a939ab6746',
                        reply_id: reply_id,
                        delete_password: 'test' 
                    })
                    .end(function(err, res) {
                        assert.equal(res.status, 200);
                        assert.equal(res.text, 'success');
                        done();
                    });        
            })
    })

    //Reporting a reply: PUT request to /api/replies/{board}
    test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
        chai.request(server)
            .put('/api/replies/test')
            .send({
                board: 'test',
                thread_id: '65fc37edf58fe7a939ab6746',
                reply_id: '65fc39f849958aaddfdabe8f'
            })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, 'reported')
                done();
            })
        });
});
