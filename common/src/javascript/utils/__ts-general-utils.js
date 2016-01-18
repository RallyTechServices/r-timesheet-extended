Ext.define('TSUtilities', {
    singleton: true,
    
    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };

        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _getEditableProjectForCurrentUser: function() {
        var app = Rally.getApp();
        if ( this._currentUserCanWrite() ) {
            return app.getContext().getProjectRef();
        }
        
        var workspace_oid = this._getOidFromRef( app.getContext().getWorkspaceRef());
        
        var editor_permissions = Ext.Array.filter(app.getContext().getPermissions().userPermissions, function(permission){
            if ( Ext.isEmpty(permission.Workspace) ) {
                return false;
            }
            var permission_oid = this._getOidFromRef(permission.Workspace);

            //console.log('comparing ', workspace_oid, permission_oid, permission);
            if (workspace_oid  !=  permission_oid) {
                return false;
            }
                        
            return ( permission.Role == "Editor" || permission.Role == "ProjectAdmin");
        },this);
        
        console.log('perms:', editor_permissions);
        
        if ( editor_permissions.length > 0 ) {
            return editor_permissions[0]._ref;
        }
        return false;
    },
    
    _getOidFromRef: function(ref) {
        var ref_array = ref.replace(/\.js$/,'').split(/\//);
        return ref_array[ref_array.length-1];
    },
    
    // true if sub or workspace admin
    _currentUserIsAdmin: function(){
        var app = Rally.getApp();
        
        if ( app.getContext().getUser().SubscriptionAdmin ) {
            return true;
        }
        
        var permissions = app.getContext().getPermissions().userPermissions;

        var workspace_admin_list = Ext.Array.filter(permissions, function(p) {
            return ( p.Role == "Workspace Admin" || p.Role == "Subscription Admin");
        });
        
        var current_workspace_ref = app.getContext().getWorkspace()._ref;
        var is_workspace_admin = false;
                
        if ( workspace_admin_list.length > 0 ) {
            Ext.Array.each(workspace_admin_list, function(p){
                
                if (current_workspace_ref.replace(/\.js$/,'') == p._ref.replace(/\.js$/,'')) {
                    is_workspace_admin = true;
                }
            });
        }
        
        return is_workspace_admin;
    },
    
    _currentUserCanWrite: function() {
        var app = Rally.getApp();
        
        //console.log('_currentUserCanWrite',app.getContext().getUser(), app.getContext().getUser().SubscriptionAdmin);
        if ( app.getContext().getUser().SubscriptionAdmin ) {
            return true;
        }
        
        var permissions = app.getContext().getPermissions().userPermissions;

        var workspace_admin_list = Ext.Array.filter(permissions, function(p) {
            return ( p.Role == "Workspace Admin" || p.Role == "Subscription Admin");
        });
        
        var current_workspace_ref = app.getContext().getWorkspace()._ref;
        var can_unlock = false;
                
        if ( workspace_admin_list.length > 0 ) {
            Ext.Array.each(workspace_admin_list, function(p){
                
                if (current_workspace_ref.replace(/\.js$/,'') == p._ref.replace(/\.js$/,'')) {
                    can_unlock = true;
                }
            });
        }
        
        console.log('  ', can_unlock);
        return can_unlock;
    },
    
    _currentUserCanUnapprove: function() {
        return this._currentUserIsAdmin();
    }
    
});