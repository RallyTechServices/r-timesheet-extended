#Time Sheet Approval

## Development Notes

* Approval status (and who/when) is saved in a preference where the key is
the week start and the user OID and the number of millisconds since 1970. 
(rally.technicalservices.timesheet.status.2016-01-03.1127100000033.1453440772000)
* A preference is saved for each approval/unapproval so that we can audit approvals
and re-openings.

## Test Plan
* State Filter
   * PASS - loads only timesheets in desired state
* Day picker
   * PASS - all days in week reset picker to start of week
   * PASS - default is prior month
* Row Actions
   * PASS - Empty for not submitted sheets
   * PASS - Approve submitted sheets
   * PASS - Unapprove approved sheets
   * Multiple sheet actions

### Timesheet popup
* Create a sheet for a new week
* Edit a sheet for an existing week
* State Changes:
   * Submit
   * Submitted data cannot be edited by user
   * Unsubmit
   * Approved
   * Processed
* Add Items
   * defects
   * Add defect for story that already has a row
   * task from defect
   * story
   * task
   * Re-add defect, story or task that already exists
* Remove Items
   * Story, Defect, Task
   * Removing item decreemnts total
* View Comments
* Test with renamed PortfolioItem (e.g. Feature renamed "Epic")
* Set as default
   * defects
   * story
   * task
* "Add My Tasks" brings in default
   * defects
   * stories
   * tasks
* Column data
   * Sort (causes duplicate items)
   * Columns can be added / removed
   * Columns selections persist across reloads
   * Feature shown for stories with feature
   * Feature blank for stories without feature
   * Feature shown for tasks on stories with feature
   * Feature blank for tasks on stories without feature
   * Work Product shown for all stories, defects and tasks
   * Work Product Estimate shown for all items with estimate
   * Work Product Schedule State
   * Task shown for tasks
   * Task Estimate
   * Task State
   * Release
   * Iteration
* Days columns
   * Order matches configured start day of week
   * Weekends colored blue
   * Totals colored grey
   * 0-24 range, floating input only
   * Adjusting day adjusts day total
   * Adjusting day adjusts week total
   * Total red if <40
 * Data saving
   * Entered data shown on browser refesh
   * PASS - Entered data shown on change to different week and back
* PASS - Comments
   * PASS - Read comments
   * PASS - Add comments

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  Server is only used for debug,
  name, className and sdk are used for both.
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to run the
  slow test specs.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.
