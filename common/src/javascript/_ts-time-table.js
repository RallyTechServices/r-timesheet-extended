/**
 */
 
 Ext.define('Rally.technicalservices.TimeTable', {
    extend: 'Ext.Container',
    alias: 'widget.tstimetable',
    
    logger: new Rally.technicalservices.Logger(),

    rows: [],
    
    /**
     * @property {String} cls The base class applied to this object's element
     */
    cls: "tstimetable",

    time_entry_item_fetch: ['WeekStartDate','WorkProductDisplayString','WorkProduct','Task',
        'TaskDisplayString','Feature','Project', 'ObjectID', 'Name', 'Release'],
        
    config: {
        weekStart: new Date(),
        editable: true
    },
    
    constructor: function (config) {
        this.mergeConfig(config);
        
        this.callParent([this.config]);
    },

    initComponent: function () {
        var me = this;
        this.callParent(arguments);
        
        this.addEvents(
            /**
             * @event
             * Fires when the grid has been rendered
             * @param {Rally.technicalservices.TimeTable} this
             * @param {Rally.ui.grid.Grid} grid
             */
            'gridReady'
        );
        
        this.weekStart = this._getStartOfWeek(this.weekStart);
        this.logger.log("Week Start: ", this.weekStart);
        
        Rally.technicalservices.TimeModelBuilder.build('TimeEntryItem','TSTableRow').then({
            scope: this,
            success: function(model) {
//                Ext.Array.each(model.getFields(), function(field){
//                    console.log(' - ', field.name, field.type );
//                });
                
                var table_store = Ext.create('Rally.data.custom.Store',{
                    model: 'TSTableRow',
                    groupField: '__SecretKey'
                });
                
                this._makeGrid(table_store);
                this._updateData();
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem creating model', msg);
            }
        });
    },
    
    _updateData: function() {
        this.setLoading('Loading time...');
        var store = this.down('rallygrid').getStore();
        
        store.removeAll(true);

        Deft.Chain.sequence([
            this._loadTimeEntryItems,
            this._loadTimeEntryValues
        ],this).then({
            scope: this,
            success: function(results) {
                var time_entry_items  = results[0];
                var time_entry_values = results[1];
                
                var rows = Ext.Array.map(time_entry_items, function(item){
                    var product = item.get('Project');
                    var workproduct = item.get('WorkProduct');
                    var feature = null;
                    var release = null;
                    
                    if ( !Ext.isEmpty(workproduct) && workproduct.Feature ) {
                        feature = workproduct.Feature;
                        product = feature.Project;
                    }
                    
                    if ( !Ext.isEmpty(workproduct) && workproduct.Release ) {
                        release = workproduct.Release;
                    }
                    
                    var data = {
                        __TimeEntryItem:item,
                        __Feature: feature,
                        __Product: product,
                        __Release: release
                    };
                    
                    return Ext.create('TSTableRow',Ext.Object.merge(data, item.getData()));
                });
                
                var rows = this._addTimeEntryValues(rows, time_entry_values);
                
                this.logger.log('TEIs:', time_entry_items);
                this.logger.log('Rows:', rows);

                store.loadRecords(rows);
                this.rows = rows;
                this.setLoading(false);
            }
        });
        
    },
    
    _addTimeEntryValues: function(rows, time_entry_values) {
        var rows_by_oid = {};
        
        Ext.Array.each(rows, function(row) { rows_by_oid[row.get('ObjectID')] = row; });
        
        Ext.Array.each(time_entry_values, function(value){
            var parent_oid = value.get('TimeEntryItem').ObjectID;

            var row = rows_by_oid[parent_oid];
            row.addTimeEntryValue(value);
        });
        
        return rows;
    },
    
    _loadTimeEntryItems: function() {
        this.setLoading('Loading time entry items...');

        var week_start = this.weekStart;
        
        var config = {
            model: 'TimeEntryItem',
            context: {
                project: null
            },
            fetch: this.time_entry_item_fetch,
            filters: [
                {property:'WeekStartDate',value:week_start},
                {property:'User.ObjectID',value:Rally.getApp().getContext().getUser().ObjectID}
            ]
        };
        
        return this._loadWsapiRecords(config);
    },
    
    _loadTimeEntryValues: function() {
        this.setLoading('Loading time entry values...');
        var week_start = this.weekStart;

        var config = {
            model: 'TimeEntryValue',
            context: {
                project: null
            },
            fetch: ['DateVal','Hours','TimeEntryItem','ObjectID'],
            filters: [
                {property:'TimeEntryItem.WeekStartDate',value:week_start},
                {property:'TimeEntryItem.User.ObjectID',value:Rally.getApp().getContext().getUser().ObjectID}
            ]
        };
        
        return this._loadWsapiRecords(config);
    },
    
    _makeGrid: function(table_store) {
        this.removeAll();
        
        var me = this;
        var columns = this._getColumns();
                
        this.grid = this.add({ 
            xtype:'rallygrid', 
            store: table_store,
            columnCfgs: columns,
            showPagingToolbar : false,
            showRowActionsColumn : false,
            sortableColumns: false,
            disableSelection: true,
            enableColumnMove: false,
            viewConfig: {
                listeners: {
                    scope: this,
                    itemupdate: function(row, row_index) {
                        me.logger.log('itemupdate', row);
                    }
                }
            },
            features: [{
                ftype: 'groupingsummary',
                startCollapsed: false,
                hideGroupedHeader: true,
                groupHeaderTpl: ' ',
                enableGroupingMenu: false
            }]
        });
        
        this.fireEvent('gridReady', this, this.grid);
        
    },
    
    addRowForItem: function(item) {
        var me = this;
        var week_start_date = this.weekStart;
        
        var item_type = item.get('_type');
        
        if ( !this._hasRowForItem(item)) {
            Rally.data.ModelFactory.getModel({
                type: 'TimeEntryItem',
                scope: this,
                success: function(model) {
                    var fields = model.getFields();

                    var _ref = item.get('_ref');
                    
                    var config = {
                        WorkProduct: { _ref: _ref },
                        WeekStartDate: week_start_date
                    };
                    
                    if ( item_type == "task" ) {
                        config.Task = { _ref: _ref };
                        config.WorkProduct = { _ref: item.get('WorkProduct')._ref };
                    }
                    
                    var time_entry_item = Ext.create(model,config);
                    
                    time_entry_item.save({
                        fetch: me.time_entry_item_fetch,
                        callback: function(result, operation) {
                            if(operation.wasSuccessful()) {
                                var product = result.get('Project');
                                var workproduct = result.get('WorkProduct');
                                var feature = null;
                                var release = null;
                                
                                if ( !Ext.isEmpty(workproduct) && workproduct.Feature ) {
                                    feature = workproduct.Feature;
                                    product = feature.Project;
                                }
                                
                                if ( !Ext.isEmpty(workproduct) && workproduct.Release ) {
                                    release = workproduct.Release;
                                }
                                
                                var data = {
                                    __TimeEntryItem:result,
                                    __Feature: feature,
                                    __Product: product,
                                    __Release: release
                                };
                                
                                var row = Ext.create('TSTableRow',Ext.Object.merge(data, time_entry_item.getData()));
                                me.grid.getStore().loadRecords([row], { addRecords: true });
                                me.rows.push(row);
                            }
                        }
                    });
                }
            });
        }
    },
    
    _hasRowForItem: function(item) {
        var item_type = item.get('_type');
        
        var hasRow = false;
        Ext.Array.each(this.rows, function(row) {
            if ( item_type == "task" ) {
                if ( row.get('Task') && row.get('Task')._ref == item.get('_ref') ) {
                    hasRow = true;
                }
            } else {
                if ( Ext.isEmpty(row.get('Task')) && row.get('WorkProduct') && row.get('WorkProduct')._ref == item.get('_ref') ) {
                    hasRow = true;
                }
            }
        });
        return hasRow;
    },
    
    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        
        var final_config = Ext.Object.merge(default_config,config);
        this.logger.log("Starting load:",final_config.model);
          
        Ext.create('Rally.data.wsapi.Store', final_config).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _getColumns: function(task_states) {
        var me = this;
                
        var columns = [
            {
                dataIndex: '__Product',
                text: 'Product',
                flex: 1,
                editor: null,
                renderer: function(v) {
                    return v._refObjectName;
                },
                summaryRenderer: function() {
                    return "Totals";
                }
            },
            {
                dataIndex: '__Feature',
                text:  'Feature',
                flex: 1,
                editor: null,
                renderer: function(v) {
                    if ( Ext.isEmpty(v) ) { return ""; }
                    return v._refObjectName;
                }
            },
            {
                dataIndex: 'WorkProductDisplayString',
                text:  'Work Product',
                flex: 1,
                editor: null
            },
            {
                dataIndex: '__Release',
                text: 'Release',
                flext: 1,
                editor: null,
                renderer: function(v) {
                    if ( Ext.isEmpty(v) ) { return ""; }
                    return v._refObjectName;
                }
            },
            {
                dataIndex: 'TaskDisplayString',
                text:  'Task',
                flex: 1,
                editor: null
            }
        ];
        
        var day_width = 50;
        
        var editor_config = {
            xtype:'rallynumberfield',
            minValue: 0,
            maxValue: 24
        };
        
        if ( ! this.editable ) {
            editor_config = null;
        }
        
        
        columns.push({dataIndex:'__Sunday',   width: day_width, text:'Sun',   align: 'center',editor: editor_config, summaryType: 'sum'});
        columns.push({dataIndex:'__Monday',   width: day_width, text:'Mon',   align: 'center',editor: editor_config, summaryType: 'sum'});
        columns.push({dataIndex:'__Tuesday',  width: day_width, text:'Tue',   align: 'center',editor: editor_config, summaryType: 'sum'});
        columns.push({dataIndex:'__Wednesday',width: day_width, text:'Wed',   align: 'center',editor: editor_config, summaryType: 'sum'});
        columns.push({dataIndex:'__Thursday', width: day_width, text:'Thur',  align: 'center',editor: editor_config, summaryType: 'sum'});
        columns.push({dataIndex:'__Friday',   width: day_width, text:'Fri',   align: 'center',editor: editor_config, summaryType: 'sum'});
        columns.push({dataIndex:'__Saturday', width: day_width, text:'Sat',   align: 'center',editor: editor_config, summaryType: 'sum'});
        
        var total_renderer = function(v, meta, record) {
            meta.tdCls = "totals";
            return v;
        };
        columns.push({dataIndex:'__Total',    width: day_width, text:'Total', align: 'center',editor: null,          summaryType: 'sum',
            renderer: total_renderer
        });

        
        return columns;
    },
    
    /*
     * Given a date, return the beginning of the week (iso, utc)
     */
    _getStartOfWeek: function(date_in_week){
        if ( typeof(date_in_week) == 'undefined' ) {
            date_in_week = new Date();
        }

        var day_of_week = date_in_week.getDay();
        var day_of_month = date_in_week.getDate();
        
        // determine what beginning of week is
        var start_of_week_js = date_in_week;
        start_of_week_js.setDate( day_of_month - day_of_week );
        
        return Rally.util.DateTime.toIsoString(start_of_week_js,true).replace(/T.*$/,'T00:00:00.000Z');
       
    }

});
