Ext.define("TSExtendedTimesheet", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 5 },

    layout: { type: 'border' },
    
    items: [
        {xtype:'container', itemId:'selector_box', region: 'north',  layout: { type:'hbox' }, minHeight: 25},
        {xtype:'container', itemId:'display_box' , region: 'center', layout: { type: 'border'} }
    ],

    integrationHeaders : {
        name : "TSExtendedTimesheet"
    },
    
    config: {
        defaultSettings: {
            preferenceProjectRef: '/project/51712374295'
        }
    },
   
    _timeLockKeyPrefix: 'rally.technicalservices.timesheet.weeklock',
    _commentKeyPrefix: 'rally.technicalservices.timesheet.comment',
    _approvalKeyPrefix: 'rally.technicalservices.timesheet.status',

    launch: function() {
        var preference_project_ref = this.getSetting('preferenceProjectRef');
        if ( !  TSUtilities.isEditableProjectForCurrentUser(preference_project_ref,this) ) {
            Ext.Msg.alert('Contact your Administrator', 'This app requires editor access to the preference project.');
        } else {
            this._addSelectors(this.down('#selector_box'));
        }
    },
    
    _addSelectors: function(container) {
        container.add({
            xtype:'container',
            itemId: 'button_box'
        });
        
        container.add({ xtype:'container', itemId:'status_box'});
        
        container.add({xtype:'container',flex: 1});
        
        container.add({
            xtype:'rallydatefield',
            itemId:'date_selector',
            fieldLabel: 'Week Starting',
            listeners: {
                scope: this,
                change: function(dp, new_value) {
                    var week_start = TSDateUtils.getBeginningOfWeekForLocalDate(new_value);
                    if ( week_start !== new_value ) {
                        dp.setValue(week_start);
                    }
                    if ( new_value.getDay() === 0 ) {
                        this.updateData();
                    }
                }
            }
        }).setValue(new Date());
        
        //if ( this.isExternal() ) {
            container.add({type:'container', html: '&nbsp;&nbsp;&nbsp;', border: 0, padding: 10});
        //}
    },
    
    _addButtons: function(container) {
        container.removeAll();
        
        container.add({
            xtype:'rallybutton',
            text: 'Add My Tasks',
            toolTipText: "(in current iteration)", 
            padding: 2,
            disabled: true,
            listeners: {
                scope: this,
                click: this._addCurrentTasks
            }
        });
        
        container.add({
            xtype:'rallybutton',
            text: '+<span class="icon-task"> </span>',
            disabled: true,
            toolTipText: "Search and add Tasks", 
            listeners: {
                scope: this,
                click: this._findAndAddTask
            }
        });
        
        container.add({
            xtype:'rallybutton',
            text: '+<span class="icon-story"> </span>',
            toolTipText: "Search and add User Stories",
            disabled: true,
            listeners: {
                scope: this,
                click: this._findAndAddStory
            }
        });
        
        this._addCommentButton(container);
    },
    
    _addCommentButton: function(container) {
        this.logger.log('_addCommentButton', this.startDateString);
        var start_date = this.startDateString;
        
        var comment_key = Ext.String.format("{0}.{1}.{2}", 
            this._commentKeyPrefix,
            start_date,
            this.getContext().getUser().ObjectID
        );
        
        container.add({
            xtype:'tscommentbutton',
            toolTipText: 'Read/Add Comments',
            keyPrefix: comment_key
        });
    },
    
    updateData: function()  { 
        var me = this;
        
        Ext.Array.each( this.query('rallybutton'), function(button) {
            button.setDisabled(true);
        });
                                
        var display_box = this.down('#display_box');
        var button_box = this.down('#button_box');
        var status_box = this.down('#status_box');
        
        display_box.removeAll();
        button_box.removeAll();
        status_box.removeAll();
        
        this.startDate = this.down('#date_selector').getValue();
        this.startDateString = TSDateUtils.getBeginningOfWeekISOForLocalDate(this.startDate);
        
        this.logger.log("Date changed to:", this.startDate, this.startDateString);
        
        Deft.Chain.sequence([
            this._loadWeekStatusPreference,
            this._loadWeekLockPreference
        ],this).then({
            scope: this,
            success: function(results) {

                var status_prefs = results[0];
                var week_lock_prefs = results[1];
                
                var editable = true;
                if ( status_prefs.length > 0 ) {
                    var value = status_prefs[0].get('Value');
                    var status_object = Ext.JSON.decode(value);
                    if ( status_object.status == "Approved" ) { 
                        editable = false;
                        status_box.add({xtype:'container',html:'Approved'});
                    }
                }
                if ( week_lock_prefs.length > 0 ) {
                    var value = week_lock_prefs[0].get('Value');
                    var status_object = Ext.JSON.decode(value);

                    if ( status_object.status == "Locked" ) { 
                        editable = false;
                        status_box.add({xtype:'container',html:'Week Locked'});
                    }
                }

                this.time_table = display_box.add({ 
                    xtype: 'tstimetable',
                    region: 'center',
                    layout: 'fit',
                    startDate: this.startDate,
                    editable: editable,
                    listeners: {
                        scope: this,
                        gridReady: function() {
                            this.logger.log("Grid is ready");
                            this._addButtons(button_box);
                            if ( editable ) {
                                Ext.Array.each( this.query('rallybutton'), function(button) {
                                    button.setDisabled(false);
                                });
                            }
                        }
                    }
                });
            },
            failure: function(msg) {
                Ext.Msg.alert("Problem loaing approval information", msg);
            }
        });
    },
    
    _loadWeekStatusPreference: function() {
        this.logger.log('_loadWeekStatusPreference',this.startDateString);
            
        var key = Ext.String.format("{0}.{1}.{2}", 
            this._approvalKeyPrefix,
            this.startDateString,
            this.getContext().getUser().ObjectID
        );
        this.logger.log('finding by key',key);
        
        var config = {
            model:'Preference',
            limit: 1,
            pageSize: 1,
            filters: [{property:'Name',operator: 'contains', value:key}],
            fetch: ['Name','Value'],
            sorters: [{property:'CreationDate', direction: 'DESC'}]
        };
        
        return TSUtilities.loadWsapiRecords(config);
    },
    
    _loadWeekLockPreference: function() {
        this.logger.log('_loadWeekLockPreference', this.startDateString);
        
        var key = Ext.String.format("{0}.{1}", 
            this._timeLockKeyPrefix,
            this.startDateString
        );
        this.logger.log('finding by key',key);
        
        var config = {
            model:'Preference',
            limit: 1,
            pageSize: 1,
            filters: [{property:'Name',operator:'contains',value:key}],
            fetch: ['Name','Value'],
            sorters: [{property:'CreationDate',direction:'DESC'}]
        };
        
        return TSUtilities.loadWsapiRecords(config);
    },
    
    _addCurrentTasks: function() {
        var timetable = this.down('tstimetable');
        if (timetable) {
            this.setLoading("Finding current tasks...");
            var config = {
                model: 'Task',
                context: {
                    project: null
                },
                fetch: Ext.Array.merge(
                    Rally.technicalservices.TimeModelBuilder.getFetchFields(),
                    ['ObjectID','Name','FormattedID','WorkProduct','Project']
                ),
                filters: [
                    {property:'Owner.ObjectID',value:this.getContext().getUser().ObjectID},
                    {property:'Iteration.StartDate',operator: '<=', value:Rally.util.DateTime.toIsoString(new Date())},
                    {property:'Iteration.EndDate',  operator: '>=', value:Rally.util.DateTime.toIsoString(new Date())}
                ]
            };
            
            TSUtilities.loadWsapiRecords(config).then({
                scope: this,
                success: function(tasks) {
                    Ext.Array.each(tasks, function(task){
                        timetable.addRowForItem(task);
                    });
                    
                    this.setLoading(false);
                },
                failure: function(msg) {
                    Ext.Msg.alert("Problem loading current tasks", msg);
                }
            });
        }
    },
    
    _findAndAddTask: function() {
        var timetable = this.down('tstimetable');
        
        var fetch_fields = Ext.Array.merge(
            Rally.technicalservices.TimeModelBuilder.getFetchFields(),
            ['WorkProduct','Feature','Project']
        );
        
        this.logger.log('fetch fields:', fetch_fields);
        
        if (timetable) {
            Ext.create('Rally.technicalservices.ChooserDialog', {
                artifactTypes: ['task'],
                autoShow: true,
                multiple: true,
                title: 'Choose Task(s)',
                filterableFields: [
                    {
                        displayName: 'Formatted ID',
                        attributeName: 'FormattedID'
                    },
                    {
                        displayName: 'Name',
                        attributeName: 'Name'
                    },
                    {
                        displayName:'WorkProduct',
                        attributeName: 'WorkProduct.Name'
                    },
                    {
                        displayName:'Release',
                        attributeName: 'Release.Name'
                    },
                    {
                        displayName:'Project',
                        attributeName: 'Project.Name'
                    },
                    {
                        displayName:'Owner',
                        attributeName: 'Owner'
                    },
                    {
                        displayName: 'State',
                        attributeName: 'State'
                    }
                ],
                columns: [
                    {
                        text: 'ID',
                        dataIndex: 'FormattedID'
                    },
                    'Name',
                    'WorkProduct',
                    'Release',
                    'Project',
                    'Owner',
                    'State'
                ],
                fetchFields: fetch_fields,
                listeners: {
                    artifactchosen: function(dialog, selectedRecords){
                        if ( !Ext.isArray(selectedRecords) ) {
                            selectedRecords = [selectedRecords];
                        }
                        
                        Ext.Array.each(selectedRecords, function(selectedRecord){
                            timetable.addRowForItem(selectedRecord);
                        });
                    },
                    scope: this
                }
             });
        }
    },
    
    _findAndAddStory: function() {
        var timetable = this.down('tstimetable');
        if (timetable) {
            Ext.create('Rally.technicalservices.ChooserDialog', {
                artifactTypes: ['hierarchicalrequirement'],
                autoShow: true,
                title: 'Choose Story(ies)',
                multiple: true,
                filterableFields: [
                    {
                        displayName: 'Formatted ID',
                        attributeName: 'FormattedID'
                    },
                    {
                        displayName: 'Name',
                        attributeName: 'Name'
                    },
                    {
                        displayName:'Feature',
                        attributeName: 'Feature.Name'
                    },
                    {
                        displayName:'Release',
                        attributeName: 'Release.Name'
                    },
                    {
                        displayName:'Project',
                        attributeName: 'Project.Name'
                    },
                    {
                        displayName:'Owner',
                        attributeName: 'Owner'
                    },
                    {
                        displayName:'State',
                        attributeName: 'ScheduleState'
                    }
                ],
                columns: [
                    {
                        text: 'ID',
                        dataIndex: 'FormattedID'
                    },
                    'Name',
                    'WorkProduct',
                    'Release',
                    'Project',
                    'Owner',
                    'ScheduleState'
                ],
        
                fetchFields: Ext.Array.merge(
                    Rally.technicalservices.TimeModelBuilder.getFetchFields(),
                    ['WorkProduct','Feature','Project', 'ObjectID', 'Name', 'Release']
                ),
                listeners: {
                    artifactchosen: function(dialog, selectedRecords){
                        if ( !Ext.isArray(selectedRecords) ) {
                            selectedRecords = [selectedRecords];
                        }
                        
                        Ext.Array.each(selectedRecords, function(selectedRecord){
                            timetable.addRowForItem(selectedRecord);
                        });
                    },
                    scope: this
                }
             });
        }
    },
    
    getSettingsFields: function() {
        var me = this;
        
        return [{
            name: 'preferenceProjectRef',
            xtype:'rallyprojectpicker',
            fieldLabel: 'Preference Project',
            workspace: this.getContext().getWorkspaceRef(),
            showMostRecentlyUsedProjects : false,
            autoExpand: true,
            labelWidth: 75,
            labelAlign: 'left',
            minWidth: 200,
            margin: 10
        }];
    },
    
//    getOptions: function() {
//        return [
//            {
//                text: 'About...',
//                handler: this._launchInfo,
//                scope: this
//            }
//        ];
//    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});