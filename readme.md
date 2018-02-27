# Copy a Canvas Course
### *Package Name*: copy-a-canvas-course
### *Child Type*: Shell
### *Platform*: All
### *Required: Optional

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions. You can view extended documentation [Here](https://github.com/byuitechops/d2l-to-canvas-conversion-tool/tree/master/documentation).

## Purpose

This child module was originally created for the child development kit, but was later converted into a shell module so we could upload D2L courses into the same canvasOU the designers created their prototype lesson in. It's creates a new Canvas course and copies the contents of an existing Canvas course to the new one.

## How to Install

```
npm install copy-a-canvas-course
```

## Run Requirements
This child module requires the following fields in the course.info object:
* `canvasOU` ou of course to copy
* `copyCourse`  created in createCourse if it is given an existingOU

Without the wrapper the module requires a source OU and an account ID.

## Options
None

## Outputs
A new property titled `prototypeOU` is created on course.info. It is the OU of the newly created copy.

## Process
1. Validate the account ID with a get request
2. Create a new Canvas course
3. Create a course migration (copy the course)
4. Verify migration status
5. Update the name & code of the new course copy

## Log Categories
This module does not use course.log anywhere.


## Requirements
Enable us to upload a new course into an existing OU without losing the information already contained in the existing course by creating a copy of the existing course.