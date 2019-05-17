function makeRequest( method, url, payload )
{
	return new Promise( function( resolve, reject )
		{
			var xhr = new XMLHttpRequest();
			xhr.open( method, url );
			xhr.onload = function() { resolve( xhr ); };
			xhr.onerror = function() { reject( xhr ); };
			if( typeof( payload ) == "string" ) { xhr.send( payload ); }
			else if( typeof( payload ) == "object" ) { xhr.send( JSON.stringify( payload ) ); }
			else { xhr.send(); }
		} );
}

function killAllChildren( domElement )
{
	while( domElement.firstChild )
	{
		domElement.removeChild( domElement.firstChild );
	}
}

function updateActiveTokens()
{
	makeRequest( "GET", "api/admin_count_login.py" ).then( function (result) {
		var list = document.querySelector( "#loginlist" );
		killAllChildren( list );
		var groupStatus = JSON.parse( result.responseText );

		groupStatus.sort( function(a,b)
		{
			if( a.count == b.count )
			{
				return a.group.localeCompare(b.group);
			}
			return b.count - a.count;
		 } );

		for( var groupnum in groupStatus )
		{
			var group = groupStatus[ groupnum ];
			if( group.count == 0 ) { continue; }
			var newItem = document.createElement( "li" );
			newItem.appendChild( document.createTextNode( group.count ) );
			newItem.appendChild( document.createTextNode( " - " ) );
			newItem.appendChild( document.createTextNode( group.group ) );
			list.appendChild( newItem );
		}

	})
}

function updateBadKeys()
{
	makeRequest( "GET", "api/admin_top_bad_keys.py" ).then( function( result )
	{
		var list = document.querySelector( "#badkeys" );
		killAllChildren( list );
		
		var allKeys = JSON.parse( result.responseText );
		allKeys.sort( function( a, b )
		{
			if( a.count == b.count )
			{
				return a.key.localeCompare(b.key);
			}
			return b.count - a.count;
		} );

		for( var keynum in allKeys )
		{
			var key = allKeys[ keynum ];
			var newItem = document.createElement( "li" );
			newItem.appendChild( document.createTextNode( key.count ) );
			newItem.appendChild( document.createTextNode( "-" ) );
			newItem.appendChild( document.createTextNode( key.key ) );

			list.appendChild( newItem );
		}
	} );
}

function updateLastBad()
{
	makeRequest( "GET", "api/admin_last_badkey.py" ).then( function( result)
	{
		var list = document.querySelector( "#lastbad" );
		killAllChildren( list );

		var allKeys = JSON.parse( result.responseText );
		allKeys.sort( function( a, b )
		{
			return b.submittime - a.submittime;
		} );

		for( var keynum in allKeys )
		{
			var key = allKeys[ keynum ];
			var newItem = document.createElement( "li" );
			newItem.appendChild( document.createTextNode( key.key ) );
			newItem.appendChild( document.createTextNode( "-" ) );
			newItem.appendChild( document.createTextNode( key.group ) );

			list.appendChild( newItem );
		}
	} );
}

function updateClaims()
{
	makeRequest( "GET", "api/admin_top_claims.py" ).then( function( result )
	{
		var list = document.querySelector( "#topclaim" );
		killAllChildren( list );

		var allKeys = JSON.parse( result.responseText );
		allKeys.sort( function( a, b )
		{
			return b.count - a.count;
		} );

		for( var keynum in allKeys )
		{
			var key = allKeys[ keynum ];
			var newItem = document.createElement( "li" );
			newItem.appendChild( document.createTextNode( key.count ) );
			newItem.appendChild( document.createTextNode( " - " ) );
			newItem.appendChild( document.createTextNode( key.key ) );

			list.appendChild( newItem );
		}
	} );
}

function lastClaims()
{
	makeRequest( "GET", "api/admin_last_claims.py" ).then( function( result )
	{
		var list = document.querySelector( "#lastclaim" );
		killAllChildren( list );

		var allKeys = JSON.parse( result.responseText );
		allKeys.sort( function( a, b )
		{
			return b.submittime - a.submittime;
		} );

		for( var keynum in allKeys )
		{
			var key = allKeys[ keynum ];
			var newItem = document.createElement( "li" );
			newItem.appendChild( document.createTextNode( key.key ) );
			newItem.appendChild( document.createTextNode( " - " ) );
			newItem.appendChild( document.createTextNode( key.group ) );

			list.appendChild( newItem );
		}
	} );
}

function init()
{
	updateClaims();
	lastClaims();
	updateActiveTokens();
	updateBadKeys();
	updateLastBad();
}

init();
