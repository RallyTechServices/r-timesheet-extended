Ext.define('CA.technicalservices.ColumnPickerButton',{
    extend: 'Rally.ui.Button',
    requires: [
        'CA.technicalservices.ColumnPickerDialog'
    ],
    
    alias: 'widget.tscolumnpickerbutton',
    
    config: {
        columns: [],
        text: '<span class="icon-add-column"> </span>'

    },
    
    constructor:function (config) {
        this.mergeConfig(config);

        this.callParent([this.config]);
    },
    
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
            /**
             * @event columnsChosen
             * Fires when user clicks done after choosing columns
             * @param {CA.technicalservices.ColumnPickerButton} this button
             * @param [{Ext.column.Column}] columns with hidden marked true/false as appropriate
             */
            'columnsChosen'
        );
    },
    
    afterRender: function() {
        this.callParent(arguments);
        this.mon(this.el, this.clickEvent, this._showDialog, this);

    },
    
    _showDialog: function() {
        var me = this;
        Ext.create('CA.technicalservices.ColumnPickerDialog',{
            autoShow: true,
            pickableColumns: this.columns,
            listeners: {
                scope: this,
                columnsChosen: function(dialog, columns) {
                    this.fireEvent('columnsChosen', me, columns);
                }
                
            }
        });
    }
});