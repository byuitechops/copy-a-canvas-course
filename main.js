const canvas = require('canvas-wrapper');
const chalk = require('chalk');
const asyncLib = require('async');
const copyGroups = require('./copyGroups.js');

var sourceCourseID = 748;
var targetAccountID = -1;

function createCourse(callback) {
    var today = new Date();

    /* Get the old course, so we can get the name */
    canvas.get(`/api/v1/courses/${sourceCourseID}`, (oldErr, oldCourse) => {
        if (oldErr) {
            callback(oldErr);
            return;
        }
        canvas.post(`/api/v1/accounts/${targetAccountID}/courses`,
            {
                'course[name]': oldCourse[0].name,
                'course[course_code]': oldCourse[0].course_code,
            },
            (err, newCourse) => {
                if (err) callback(err, newCourse);
                else {
                    console.log(chalk.blueBright(`Gauntlet Copy Created: ${chalk.greenBright(newCourse.id)}`));
                    callback(null, newCourse);
                }
            }
        );
    });
}

function createMigration(newCourse, callback) {
    const postObj = {
        'migration_type': 'course_copy_importer',
        'settings[source_course_id]': sourceCourseID,
    }
    canvas.post(`/api/v1/courses/${newCourse.id}/content_migrations`, postObj, (err, migration) => {
        if (err) callback(err, migration, newCourse);
        else {
            console.log(chalk.blueBright(`Migration Begun: ${chalk.greenBright(migration.id)}`));
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
                        callback(null, newCourse);
                    } else {
                        console.log(chalk.blueBright(`Course Copy Progress: `) + data[0].workflow_state);
                    }
                }
            }
        );
    }, 2000);
}

/* Update the name/code of the copy to the name/code of the source course */
function updateSettings(newCourse, callback) {
    /* Get the old course, so we can get the name */
    canvas.get(`/api/v1/courses/${sourceCourseID}`, (oldErr, oldCourse) => {
        if (oldErr) {
            callback(oldErr);
            return;
        }
        /* Put the name/code into the new course */
        canvas.put(`/api/v1/courses/${newCourse.id}`,
        {
            'course': {
                name: oldCourse.name,
                course_code: oldCourse.course_code
            }
        },
        (newErr, changedCourse) => {
            if (newErr) {
                callback(newErr);
                return;
            }
            callback(null, newCourse);
        });
    });
}

module.exports = (sID, aID, stepCallback) => {
    sourceCourseID = sID;
    canvas.get('/api/v1/accounts', (err, accounts) => {
        if (err) stepCallback(err, accounts);
        else {
            var exists = accounts.find(account => {
                return account.id = aID;
            });

            if (!exists) {
                stepCallback(chalk.redBright('Please input a valid Account ID.'));
            } else {
                sourceCourseID = sID;
                targetAccountID = aID;

                asyncLib.waterfall([
                    createCourse,
                    createMigration,
                    checkMigration,
                    updateSettings,
                ], (err, newCourse) => {
                    if (err) stepCallback(err, newCourse);
                    else {
                        copyGroups(sID, newCourse.id, () => {
                            stepCallback(null, newCourse);
                        });
                    }
                });
            };
        }
    });
};
