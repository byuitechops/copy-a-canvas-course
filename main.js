/* eslint-env node, es6 */
/* eslint no-console:0 */
const canvas = require('canvas-wrapper');
const chalk = require('chalk');
const asyncLib = require('async');
const Enquirer = require('enquirer');
var enquirer = new Enquirer();

/* set up enquirer */
enquirer.register('confirm', require('prompt-confirm'));
const questions = [{ type: 'confirm', name: 'isValid', message: 'Did the course copy correctly?'
}];

var sourceCourseID = 748;
var targetAccountID = -1;

function createCourse(callback) {
    /* Get the old course, so we can get the name */
    canvas.get(`/api/v1/courses/${sourceCourseID}`, (oldErr, oldCourse) => {
        if (oldErr) {
            callback(oldErr);
            return;
        }
        canvas.post(`/api/v1/accounts/${targetAccountID}/courses`, {
            'course[name]': oldCourse[0].name,
            'course[course_code]': oldCourse[0].course_code,
        },
        (err, newCourse) => {
            if (err) callback(err, newCourse);
            else {
                console.log(chalk.blueBright(`Course Copy Created: ${chalk.greenBright(newCourse.id)}`));
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
    };
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
                } else if (data[0].workflow_state === 'failed') {
                    clearInterval(checkLoop);
                    callback(new Error('Migration Failed'), newCourse);
                } else {
                    if (data[0].workflow_state === 'completed') {
                        clearInterval(checkLoop);
                        callback(null, newCourse);
                    } else {
                        console.log(chalk.blueBright('Course Copy Progress: ') + data[0].workflow_state);
                    }
                }
            }
        );
    }, 2000);
}


function getMigrationIssues(newCourse, callback) {
    canvas.get(`/api/v1/courses/${newCourse.id}/content_migrations`, (err, migrations) => {
        if (err) {
            callback(err, newCourse);
            return;
        }
        canvas.get(`/api/v1/courses/${newCourse.id}/content_migrations/${migrations[0].id}/migration_issues`, (err, migrationIssues) => {
            if (err) {
                callback(err, newCourse);
                return;
            }

            var migrationErrs = migrationIssues.some(issue => {
                return issue.issue_type === 'error';
            });

            if (!migrationErrs) {
                callback(null, newCourse);
            } else {
                /* use enquire to have user verify course migration statys */
                /* OR filter migration issues by type and only stop import if there are errors. Have human verify if there are warnings? */
                console.log('Migration Issues Found. Please Verify course copy integrity.');
                console.log(`https://byui.instructure.com/courses/${newCourse.id}/content_migrations/`);

                enquirer.ask(questions)
                    .then(answer => {
                        if (answer.isValid)
                            callback(null, newCourse);
                        else
                            callback(new Error('Original Canvas course failed to copy'), newCourse);
                    });
            }
        });
    });
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
        canvas.put(`/api/v1/courses/${newCourse.id}`, {
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
                    getMigrationIssues,
                    updateSettings,
                ], (err, newCourse) => {
                    if (err) {
                        stepCallback(err, newCourse);
                        return;
                    } else {
                        stepCallback(null, newCourse);
                    }
                });
            }
        }
    });
};