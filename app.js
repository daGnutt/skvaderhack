function init()
{
	authtoken = localStorage.getItem( "authtoken" );
	loadGroups();

	query = parseQuery( window.location.search );

	if( "password_recovery" in query )
	{
		console.log( "Password Recovery" );
		showOnlyHead( "passwordreset" );
		document.getElementById( "txtRedPwdRecEmail" ).value = query.email;
		document.getElementById( "txtRedPwdRecToken" ).value = query.token;
		document.getElementById( "txtRedPwdRecPwd" ).focus();
	}
	else if( authtoken )
	{
		console.log( "Logged in" );
		verifyAuthToken();
	}
	else
	{
		console.log( "Log in" );
		prepareLogin();
	}
}

function loadGroups()
{
	makeRequest( 'GET', 'api/groups.py' ).then( function( request )
	{
		if( request.status != 200 )
		{
			throw request;
		}

		var parent = document.getElementById( "lstGroups" );
		killAllChildren( parent );
		var groups = JSON.parse( request.responseText );
		for( var groupnum in groups )
		{
			var group = groups[ groupnum ];
			var newElement = document.createElement( "option" );
			newElement.value = group;
			parent.appendChild( newElement );
		}
	} );
}

function parseQuery( queryString )
{
	var query = {};
	var pairs = ( queryString[ 0 ] === '?' ? queryString.substr( 1 ) : queryString ).split( '&' );
	for( var i = 0; i < pairs.length; i++ )
	{
		var pair = pairs[ i ].split( '=' );
		query[ decodeURIComponent( pair[ 0 ] ) ] = decodeURIComponent( pair[ 1 ] || '' );
	}
	return query;
}

function btnGroupCreate_Click()
{
	showOnlyHead( "creategroup" );
	history.pushState( { page: "creategroup" }, null, "/index.html?create_group" );
}

function validateCreateGroupForm()
{
	var name = document.getElementById( "txtCreateGroupName" ).value;
	var password = document.getElementById( "txtCreateGroupPassword" ).value;
	var email = document.getElementById( "txtCreateGroupEmail" ).value;

	var regex = new RegExp( /^\S+@\S+\.\S+$/ );

	if( name.length && password.length && email.match( regex ) )
	{
		document.getElementById( "btnCreateGroupSave" ).disabled = false;
	}
	else
	{
		document.getElementById( "btnCreateGroupSave" ).disabled = true;
	}
}

function sendCreateGroup_Click()
{
	var name = document.getElementById( "txtCreateGroupName" ).value;
	var password = document.getElementById( "txtCreateGroupPassword" ).value;
	var email = document.getElementById( "txtCreateGroupEmail" ).value;

	password = btoa( password );

	var payload = {
		action: "create",
		groupname: name,
		password: password,
		contact: email
	};

	makeRequest( 'POST', 'api/groups.py', payload ).then( function( request )
	{
		if( request.status != 200 )
		{
			showMessage( request.responseText );
		}
		else
		{
			localStorage.authtoken = JSON.parse( request.responseText );
			prepareKeySubmit();
			history.pushState( { page: "keysubmit" }, null, "/index.html?loggedin" );
		}
	} );
}

function btnCreateGroupCancel_Click()
{
	history.pushState( { page: "login" }, null, "/index.html?login" );
	showOnlyHead( "login" );
}

function prepareLogin()
{
	showOnlyHead( "login" );
	document.getElementById( "txtGroupName" ).focus();
	fetchScores();
}

function fetchScores()
{
	makeRequest( "GET", "/api/score.py" ).then( function( request )
	{
		scores = JSON.parse( request.responseText );
		showScoreBoard( scores );
	} );
}



function validateLoginScreen( event )
{
	var groupname = document.getElementById( "txtGroupName" ).value;
	var password = document.getElementById( "txtGroupPwd" ).value;

	if( groupname.length && password.length )
	{
		document.getElementById( "btnGroupLogin" ).disabled = false;
		if( event.code == "Enter" )
		{
			performLogin();
		}
	}
	else
	{
		document.getElementById( "btnGroupLogin" ).disabled = true;
	}
}

function performLogin()
{
	var groupname = document.getElementById( "txtGroupName" ).value;
	var password = document.getElementById( "txtGroupPwd" ).value;
	password = btoa( password );

	makeRequest( 'POST', 'api/auth.py', { action: "login", username: groupname, password: password } ).then( function( request )
	{
		if( request.status == 200 )
		{
			localStorage.setItem( 'authtoken', JSON.parse( request.responseText ) );
			history.pushState(
			{
				page: "keysubmit"
			}, null, "/index.html?loggedin" );
			prepareKeySubmit();
		}
		else
		{
			throw request;
		}
	} ).catch( function( request )
	{
		if( request.status == 403 )
		{
			prepareLogin();
			showMessage( request.responseText );
		}
		else
		{
			throw request;
		}
	} );
}

function verifyAuthToken()
{
	var token = localStorage.getItem( "authtoken" );
	if( token === null ) //Missing token, send to login
	{
		prepareLogin();
		return;
	}

	makeRequest( "POST", "api/auth.py", { action: "authtoken", "token": token } ).then( function( request )
	{
		if( request.status == 200 )
		{
			prepareKeySubmit();
		}
		else
		{
			localStorage.removeItem( "authtoken" );
			prepareLogin();
		}
	} );
}

function prepareKeySubmit()
{
	showOnlyHead( "keysubmit" );
	document.getElementById( "txtKeySubmit" ).focus();
	getGroupStatus();
}

function validateKeySubmit( event )
{
	if( event.key == "Enter" )
	{
		btnKeySubmit_Click();
	}

}

function btnKeySubmit_Click()
{
	if( document.getElementById( "btnKeySubmit" ).disabled )
	{
		throw "Not allowed to submit keys yet!";
	}
	var key = document.getElementById( "txtKeySubmit" ).value;
	if( key.length )
	{
		var payload = {
			"action": "submitkey",
			"authtoken": localStorage.getItem( "authtoken" ),
			"key": key

		};

		makeRequest( "POST", "api/key.py", payload )
			.then( function( request )
			{
				switch( request.status )
				{
					case 200: //All is ok
						showMessage( "A Correct key was supplied" );
						document.getElementById( "txtKeySubmit" ).value = "";
						document.getElementById( "txtKeySubmit" ).focus();
						break;
					case 400: //Bad key (first submit)
						showMessage( "Bad key was submitted" );
						break;
					case 401: //Authtoken not valid
						showOnlyHead( "login" );
						showMessage( "Please relogin and try again" );
						return;
					case 403: //Not allowed to post yet, please wait
						showMessage( "You are not allowed to post yet, please wait and try again" );
						break;
					case 410: //Key already submitted
						showMessage( "You've already submitted this" );
						break;

				}
				updateGroupStatus( JSON.parse( request.responseText ) );
			} );
	}
	else
	{
		throw "No key";
	}
}

function getGroupStatus()
{
	if( tmrUpdateGroupStatus )
	{
		clearTimeout( tmrUpdateGroupStatus );
	}
	var payload = {
		action: "groupstatus",
		authtoken: localStorage.getItem( "authtoken" )
	};

	makeRequest( 'POST', 'api/key.py', payload ).then( function( request )
	{
		updateGroupStatus( JSON.parse( request.responseText ) );
	} );
}

tmrUpdateGroupStatus = null;

function updateGroupStatus( group_status )
{
	if( tmrUpdateGroupStatus )
	{
		clearTimeout( tmrUpdateGroupStatus );
	}

	if( group_status.time_to_new_guess === null )
	{
		document.getElementById( "nextGuess" ).style.display = "none";
		tmrUpdateGroupStatus = setTimeout( getGroupStatus, 60 * 10 * 1000 );
	}
	else
	{
		document.getElementById( "nextGuess" ).style.display = "block";
		if( ( group_status.time_to_new_guess * 1000 ) - new Date() < 60 * 10 * 1000 )
		{
			tmrUpdateGroupStatus = setTimeout( getGroupStatus, ( group_status.time_to_new_guess * 1000 ) - new Date() );
		}
		else
		{
			tmrUpdateGroupStatus = setTimeout( getGroupStatus, 60 * 10 * 1000 );
		}
	}
	document.getElementById( "lblWrongCounter" ).innerHTML = group_status.remain_guess;
	if( group_status.remain_guess )
	{
		document.getElementById( "btnKeySubmit" ).disabled = false;
	}
	else
	{
		document.getElementById( "btnKeySubmit" ).disabled = true;
	}
	var points = group_status.points;
	var foundGroup = false;
	for( var pointsnum in points )
	{
		var group_point = points[ pointsnum ];
		if( group_point.name == group_status.group )
		{
			foundGroup = true;
			document.getElementById( "lblGroupScore" ).innerHTML = group_point.score;
			break;
		}
	}
	if( !foundGroup )
	{
		document.getElementById( "lblGroupScore" ).innerHTML = 0;
	}
	var nextGuess = group_status.time_to_new_guess;
	nextGuess = new Date( nextGuess * 1000 );
	var hours = "0" + nextGuess.getHours();
	var minutes = "0" + nextGuess.getMinutes();
	var formatedTime = hours.substr( -2 ) + ":" + minutes.substr( -2 );
	document.getElementById( "lblWrongCountdown" ).innerHTML = formatedTime;

	showScoreBoard( group_status.points );
}

function showScoreBoard( scores )
{
	var scoreboard = document.getElementById( "scoreboard" );
	scores.sort( function( a, b ) { return b.score - a.score; } );
	killAllChildren( scoreboard );
	for( var scoreplace in scores )
	{
		var group = scores[ scoreplace ];
		var newGroup = document.createElement( "div" );
		var groupName = document.createElement( "div" );
		var groupScore = document.createElement( "div" );

		newGroup.classList.add( "score-item" );

		groupName.appendChild( document.createTextNode( group.name ) );
		groupScore.appendChild( document.createTextNode( group.score ) );

		newGroup.appendChild( groupName );
		newGroup.appendChild( groupScore );
		scoreboard.appendChild( newGroup );
	}
}

function btnLogout_Click()
{
	history.pushState( { page: "login" }, null, "/index.html?login" );
	localStorage.removeItem( "authtoken" );
	showOnlyHead( "login" );
}

function btnRecoverPassword_Click()
{
	showOnlyHead( "passwordrecovery" );
	history.pushState( { page: "passwordrecovery" }, null, "/index.html?init_recovery" );
}

function btnReqPwdCancel_Click()
{
	showOnlyHead( "login" );
	history.pushState( { page: "login" }, null, "/index.html?login" );
}

function validateRecoveryRequest( event )
{
	var regex = new RegExp( /^\S+@\S+\.\S+$/ );
	var email = document.getElementById( "txtReqPwdRec" ).value;
	if( email.match( regex ) )
	{
		document.getElementById( "btnReqPwdReq" ).disabled = false;
	}
	else
	{
		document.getElementById( "btnReqPwdReq" ).disabled = true;
	}
	if( event.code == "Enter" )
	{
		btnReqPwdReq_Click();
	}
}

function btnReqPwdReq_Click()
{
	var regex = new RegExp( /^\S+@\S+\.\S+$/ );
	var email = document.getElementById( "txtReqPwdRec" ).value;
	if( email.length == 0 || !email.match( regex ) )
	{
		setTimeout( function() { showMessage( "Must enter a email" ); }, 1 );
		return;
	}

	var payload = { action: "request_token", email: email };

	makeRequest( 'POST', 'api/password_recovery.py', payload ).then( function( request )
	{
		if( request.status == 200 )
		{
			history.pushState( { page: "passwordreset" }, null, "/index.html?password_recovery" );
			showOnlyHead( "passwordreset" );
			document.getElementById( "txtRedPwdRecEmail" ).value = document.getElementById( "txtReqPwdRec" ).value;
		}
		else
		{
			showMessage( request.responseText );
		}
	} );
}

function btnAbortNewPassword_Click()
{
	showOnlyHead( "login" );
	history.pushState( { page: "login" }, null, "/index.html?login" );
}

function btnSetNewPassword_Click()
{
	var email = document.getElementById( "txtRedPwdRecEmail" ).value;
	var token = document.getElementById( "txtRedPwdRecToken" ).value;
	var newpass = document.getElementById( "txtRedPwdRecPwd" ).value;
	newpass = btoa( newpass );

	var payload = {
		action: "reset_password",
		email: email,
		token: token,
		password: newpass
	};

	makeRequest( 'POST', 'api/password_recovery.py', payload ).then( function( request )
	{
		if( request.status == 200 )
		{
			localStorage.setItem( "authtoken", JSON.parse( this.responseText ) );
			history.pushState( { page: "login" }, null, "/index.html?loggedin" );
			prepareKeySubmit();
		}
		else
		{
			showMessage( request.responseText );
		}
	} );
}

function showOnlyHead( elementId )
{
	var ALL_ELEMENTS = [ "login", "creategroup", "passwordrecovery", "passwordreset", "keysubmit" ];
	if( !( ALL_ELEMENTS.includes( elementId ) ) )
	{
		throw "Tried to show a Head Element that does not exist [" + elementId + "]";
	}
	for( var elementPos in ALL_ELEMENTS )
	{
		var element = ALL_ELEMENTS[ elementPos ];
		if( element == elementId )
		{
			document.getElementById( element ).style.display = "block";
		}
		else
		{
			document.getElementById( element ).style.display = "none";
		}
	}
}

function killAllChildren( parentDom )
{
	if( typeof( parentDom ) == "string" )
	{
		parentDom = document.getElementById( parentDom );
	}
	if( parentDom === null )
	{
		throw "Could not find parent to kill children from.";
	}
	while( parentDom.firstChild )
	{
		parentDom.removeChild( parentDom.firstChild );
	}
}

messageTimeout = null;

function showMessage( message, background, timeout )
{
	if( !background )
	{
		document.getElementById( "message" ).style.background = "rgb(64,0,64)";
	}
	else
	{
		document.getElementById( "message" ).style.background = background;
	}
	document.getElementById( "message" ).innerHTML = message;
	document.getElementById( "message" ).style.display = "block";

	if( !timeout )
	{
		timeout = message.length * 300;
	}

	if( messageTimeout )
	{
		clearTimeout( messageTimeout );
	}
	messageTimeout = setTimeout( hideMessage, timeout );
}

function hideMessage()
{
	if( messageTimeout )
	{
		clearTimeout( messageTimeout );
		messageTimeout = null;
	}
	document.getElementById( "message" ).style.display = "none";
}

function handleState( newstate )
{
	console.log( "Trying to show a new page" );
	console.log( newstate );
	if( newstate.state )
	{
		showOnlyHead( newstate.state.page );
	}
	else
	{
		init();
	}
}




init();

if( history.state )
{
	showOnlyHead( history.state.page );
}

/**
 * @TODO: AUTO UPDATE GROUP STATUS ONCE NEW GUESS SHOULD BE AVAILABLE
 * @TODO: WHEN SUBMITTING KEY, REPLACE HISTORYSTATUS
 *
 * BASE URI FOR QR CODE
 * https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=f0f&bgcolor=380038&data=
 */

function generateQRLink( authtoken )
{
	var baseURI = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=f0f&bgcolor=380038&data=";
	var defaultURI = "https://www.skvaderhack.xyz/index.html?claimtoken=";
	var claimURI = encodeURIComponent( defaultURI ) + encodeURIComponent( authtoken );

	return baseURI + claimURI;
}

/**
 * Performs a XMLHttpRequest and returns a promise.
 * @param {String} method Type of method. Currently supports GET and POST
 * @param {String} url The URL to send the request to
 * @param {Object|String} [payload] Either a string to send, or a JSON-parseable object.
 */
function makeRequest( method, url, payload )
{
	var valid_methods = [ "GET", "POST" ];
	if( !valid_methods.includes( method ) )
	{
		throw "Unsupported Method";
	}
	return new Promise( function( resolve, reject )
	{
		var xhr = new XMLHttpRequest();
		xhr.open( method, url );
		xhr.onload = function()
		{
			resolve( xhr );
		};
		xhr.onerror = function()
		{
			reject( { status: this.status, statusText: xhr.statusText } );
		};
		if( typeof( payload ) == "string" )
		{
			xhr.send( payload );
		}
		else if( typeof( payload ) == "object" )
		{
			xhr.send( JSON.stringify( payload ) );
		}
		else
		{
			xhr.send();
		}
	} );
}

window.addEventListener( "popstate", handleState );
window.addEventListener( "click", hideMessage );
document.getElementById( "btnGroupLogin" ).addEventListener( "click", performLogin );
document.getElementById( "btnGroupCreate" ).addEventListener( "click", btnGroupCreate_Click );
document.getElementById( "btnCreateGroupSave" ).addEventListener( "click", sendCreateGroup_Click );
document.getElementById( "btnCreateGroupCancel" ).addEventListener( "click", btnCreateGroupCancel_Click );
document.getElementById( "txtKeySubmit" ).addEventListener( "keyup", validateKeySubmit );
document.getElementById( "btnKeySubmit" ).addEventListener( "click", btnKeySubmit_Click );
document.getElementById( "btnLogout" ).addEventListener( "click", btnLogout_Click );
document.getElementById( "btnRecoverPassword" ).addEventListener( "click", btnRecoverPassword_Click );
document.getElementById( "btnReqPwdCancel" ).addEventListener( "click", btnReqPwdCancel_Click );
document.getElementById( "txtReqPwdRec" ).addEventListener( "keyup", validateRecoveryRequest );
document.getElementById( "btnReqPwdReq" ).addEventListener( "click", btnReqPwdReq_Click );
document.getElementById( "btnSetNewPassword" ).addEventListener( "click", btnSetNewPassword_Click );
document.getElementById( "btnAbortNewPassword" ).addEventListener( "click", btnAbortNewPassword_Click );

document.querySelectorAll( "#frmCreateGroup input" ).forEach( function( item )
{
	item.addEventListener( "keyup", validateCreateGroupForm );
} );

document.querySelectorAll( "#login input" ).forEach( function( item )
{
	item.addEventListener( "keyup", validateLoginScreen );
} );

document.querySelectorAll( "form" ).forEach( function( item )
{
	item.addEventListener( "submit", function( listener )
	{
		listener.preventDefault();
		return false;
	} );
} );
