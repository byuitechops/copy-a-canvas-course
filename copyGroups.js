const canvas = require('canvas-wrapper');
const asyncLib = require('async');

module.exports = (sourceCourseID, targetCourseID, stepCallback) => {

    var groupIndex = {
        /*  aCategoryId: {
                newCategoryId: CategoryID
                oldGroups: GroupObject[],
                newGroups: GroupObject[],
                discussionTopics: Discussion[]
            } */
    };

    function getCategories(callback) {
        /* Get the Categories from the Source Course */
        canvas.get(`/api/v1/courses/${sourceCourseID}/group_categories`, (err, categories) => {
            if (err) callback(err, categories);
            else {
                callback(null, categories);
            }
        });
    }

    /* Create each new category in the new course */
    function setCategories(categories, callback) {
        asyncLib.each(categories, (oldCategory, eachCallback) => {

            /* The new category's settings */
            var categorySettings = {
                name: oldCategory.name,
                self_signup: oldCategory.self_signup,
                group_limit: oldCategory.group_limit,
                auto_leader: oldCategory.auto_leader,
            }

            /* POST to create new category */
            canvas.post(`/api/v1/courses/${targetCourseID}/group_categories`,
            categorySettings,
            (err, newCategory) => {
                if (err) eachCallback(err);
                else {
                    /* Add the category information to our object to keep track of old/new */
                    groupIndex[oldCategory.id] = {
                        newCategoryID: newCategory.id,
                        oldGroups: [],
                        newGroups: [],
                        discussionGroups: []
                    };
                    eachCallback(null);
                }
            });

        }, callback);
    }

    function getGroups(callback) {
        /* Get the Categories from the Source Course */
        canvas.get(`/api/v1/courses/${sourceCourseID}/groups`, (err, groups) => {
            if (err) callback(err, groups);
            else {
                callback(null, groups);
            }
        });
    }

    function setGroups(groups, callback) {
        asyncLib.each(groups, (group, eachCallback) => {
            /* Add the groups to the category in our index */
            groupIndex[group.group_category_id].oldGroups.push(group);

            /* Settings for our new group we're about to create */
            var groupSettings = {
                name: group.name,
                description: group.description,
                is_public: group.is_public,
                join_level: group.join_level,
                storage_quota_mb: group.storage_quota_mb
            };

            /* ID of the new category we just created that we want to put it in */
            var newCategoryID = groupIndex[group.group_category_id].newCategoryID;

            /* POST our new group */
            canvas.post(`/api/v1/group_categories/${newCategoryID}/groups`,
            groupSettings,
            (err, newGroup) => {
                if (err) eachCallback(err);
                else {
                    /* Add the group information to our object to keep track of old/new */
                    groupIndex[group.group_category_id].newGroups.push(newGroup);
                    eachCallback(null);
                }
            });
        }, (err) => {
            if (err) callback(err);
            else {
                callback(null, groups)
            }
        });
    }

    function getDiscussionGroups(oldGroups, callback) {
        function getDBGroups(oldGroup, eachCallback) {
            /* Get the discussion topics for each old group */
            canvas.get(`/api/v1/groups/${oldGroup.id}/discussion_topics`, (err, topics) => {
                
            });
        }

        asyncLib.each(oldGroups, getDBGroups, callback);
    }

    function setDiscussionGroups(discussionGroups, callback) {

    }

    asyncLib.waterfall([
        getCategories,
        setCategories,
        getGroups,
        setGroups,
        getDiscussionGroups,
        setDiscussionGroups
    ], (err, result) => {
        if (err) {
            console.error(err);
        }
        stepCallback();
    });
};