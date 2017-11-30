const canvas = require('canvas-wrapper');
const chalk = require('chalk');
const asyncLib = require('async');

var sourceCourseID = 748;
var targetAccountID = -1;

function createCourse(callback) {
    var today = new Date();
    canvas.post(`/api/v1/accounts/${targetAccountID}/courses`,
        {
            'course[name]': `Conversion Gauntlet ${today.getMonth()+1}/${today.getDate()} ${today.getHours()}:${today.getMinutes()}`,
            'course[course_code]': `CG ${today.getMonth()+1}/${today.getDate()} ${today.getHours()}:${today.getMinutes()}`,
        }, {},
        (err, newCourse) => {
            if (err) callback(err, newCourse);
            else {
                console.log(`New Course Created: ${newCourse.id}`);
                callback(null, newCourse);
            }
        }
    );
}

function createMigration(newCourse, callback) {
    const postObj = {
        'migration_type': 'course_copy_importer',
        'settings[source_course_id]': 748,
    }
    canvas.post(`/api/v1/courses/${newCourse.id}/content_migrations`, postObj, {}, (err, migration) => {
        if (err) callback(err, migration, newCourse);
        else {
            console.log(`Migration Created: ${migration.id}`);
            callback(null, migration, newCourse);
        }
    });
}

function checkMigration(migration, newCourse, callback) {
    var checkLoop = setInterval(() => {
        canvas.get(`/api/v1/courses/${newCourse.id}/content_migrations/${migration.id}`,
            (checkErr, data) => {
                if (checkErr) {
                    clearInterval(checkLoop);
                    callback(checkErr, newCourse);
                } else {
                    if (data[0].finished_at) {
                        clearInterval(checkLoop);
                        console.log('\nCourse Copied');
                        callback(null, newCourse);
                        console.log('Call 1');
                    } else {
                        console.log(chalk.blue(`Course Copy Progress: `) + data[0].workflow_state);
                    }
                }
            }
        );
    }, 2000);
}

module.exports = (sID, aID, stepCallback) => {
    canvas.get('/api/v1/accounts', (err, accounts) => {
        if (err) stepCallback(err, accounts);
        else {
            var exists = accounts.find(account => {
                return account.id = aID;
            });

            if (!exists) {
                stepCallback('Please input a valid Account ID.');
            } else {
                sourceCourseID = sID;
                targetAccountID = aID;

                asyncLib.waterfall([
                    createCourse,
                    createMigration,
                    checkMigration
                ], (err, newCourse) => {
                    console.log('Callback');
                    if (err) stepCallback(err, newCourse);
                    else stepCallback(null, newCourse);
                });
            };
        }
    });
};
