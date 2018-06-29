console.log("Loaded app.js");

document.getElementById("btnGroupLogin").addEventListener( "click", btnGroupLogin_Click );
document.getElementById("btnLogout").addEventListener( "click", btnLogout_Click );
document.getElementById("btnKeySubmit").addEventListener( "click", btnKeySubmit_Click );
document.getElementById("txtKeySubmit").addEventListener( "keyup", txtKeySubmit_Keyup );

document.querySelectorAll("#login input").forEach(function(a) {a.addEventListener( "keyup", txtLogin_KeyUp );});
document.querySelectorAll("#creategroup input").forEach(function(a) {a.addEventListener( "keyup", validate_new_group );});

// var urlParams;
// (window.onpopstate = function () {
// 	var match,
// 		pl     = /\+/g,  // Regex for replacing addition symbol with a space
// 		search = /([^&=]+)=?([^&]*)/g,
// 		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
// 		query  = window.location.search.substring(1);
// 	urlParams = {};
// 	while (match = search.exec(query))
// 		urlParams[decode(match[1])] = decode(match[2]);

// 	parseParams();
// })();

function parseParams()
{
	console.log(urlParams);
	if( "password_recovery" in urlParams )
	{
		localStorage.setItem( "recovery", urlParams.email );
		show_passwordRecovery();
		document.getElementById( "txtRedPwdRecToken" ).value = urlParams.token;
		document.getElementById( "txtRedPwdRecPwd" ).focus();
	}
}

function validateGroupName()
{
	var suggested_name = document.getElementById( "txtCreateGroupName" ).value;
	var matcher = RegExp(/^\w+$/);
	var is_valid = matcher.test( suggested_name );
	if(!is_valid)
	{ //@TODO: SHOW A HINT
		document.getElementById( "txtCreateGroupName" ).classList.add( "error" );	
	} else {
		document.getElementById( "txtCreateGroupName" ).classList.remove( "error" );
	}
	return is_valid;
}

var groups = [];
function fetchGroups()
{
	var fetcher = new XMLHttpRequest();
	fetcher.addEventListener( "load", parseGroups );
	fetcher.open( "GET", "api/groups.py" );
	fetcher.send();
}

function parseGroups()
{
	if( this.status != 200 )
	{
		throw this;
	}

	groups = JSON.parse( this.responseText );
	updateGroupList();
}

function txtLogin_KeyUp()
{
	if(this.id == "txtGroupName")
	{
		updateGroupList();
	}

	checkLoginButton();

	if( event.keyCode == 13 )
	{
		if( document.getElementById("btnGroupLogin").disabled == false )
		{
			btnGroupLogin_Click();
		}
	}
}

function show_passwordRecovery()
{
	document.getElementById( "login" ).style.display = "none";
	document.getElementById( "passwordrecovery" ).style.display = "block";
	if( !localStorage.getItem( "recovery" ) )
	{
		document.getElementById( "pwdrecreq" ).style.display = "block";
		document.getElementById( "pwdrecred" ).style.display = "none";
	} else {
		document.getElementById( "txtRedPwdRecEmail" ).value = localStorage.getItem( "recovery" );
		document.getElementById( "pwdrecreq" ).style.display = "none";
		document.getElementById( "pwdrecred" ).style.display = "block";
	}
}

function req_setPassword()
{
	var email = document.getElementById( "txtRedPwdRecEmail" ).value;
	var token = document.getElementById( "txtRedPwdRecToken" ).value;
	var passw = hash_password(document.getElementById( "txtRedPwdRecPwd" ).value);

	var payload = { "action": "reset_password", "email": email, "token": token, "password": passw };

	var sender = new XMLHttpRequest();
	sender.addEventListener( "load", parse_setPassword );
	sender.open( "POST", "api/password_recovery.py" );
	sender.send( JSON.stringify( payload ) );
}

function parse_setPassword()
{
	if( this.status == 200 )
	{
		localStorage.removeItem( "recovery" );
		localStorage.setItem("authtoken", this.responseText);
		location.reload();
	} else {
		showMessage( this.responseText );
	}
}

function req_passwordRecovery()
{
	var email = document.getElementById( "txtReqPwdRec" ).value;
	var payload = {"action": "request_token", "email": email};
	var sender = new XMLHttpRequest();
	sender.addEventListener( "load", parse_passwordRecovery );
	sender.open( "POST", "api/password_recovery.py" );
	sender.send(JSON.stringify( payload ));
}

function parse_passwordRecovery()
{
	if( this.status == 200 )
	{
		localStorage.setItem( "recovery", document.getElementById( "txtReqPwdRec" ).value );
		show_passwordRecovery();
	} else {
		showMessage( this.repsonseText );
	}
}

function show_createGroup()
{
	document.getElementById( "login" ).style.display = "none";
	document.getElementById( "creategroup" ).style.display = "block";
}

function hash_password(password)
{
	return btoa(password);
}

function validate_new_group()
{
	var namedom	= document.getElementById("txtCreateGroupName");
	var passdom	= document.getElementById("txtCreateGroupPassword");
	var emaildom	= document.getElementById("txtCreateGroupEmail");

	var namelength = namedom.value.length;
	var passlength = passdom.value.length;
	var emaillength = emaildom.value.length;

	//@TODO: CHECK IF GROUP ALREADY EXISTS

	if( validateGroupName() && namelength && passlength && emaillength )
	{
		document.getElementById( "btnCreateGroupSave" ).disabled = false;
		if( event.keyCode == 13 )
		{
			register_group();
		}
	} else {
		document.getElementById( "btnCreateGroupSave" ).disabled = true;
	}
}

function register_group()
{
	var payload = {
		action: "create",
		groupname: document.getElementById("txtCreateGroupName").value,
		password: hash_password(document.getElementById("txtCreateGroupPassword").value),
		contact: document.getElementById("txtCreateGroupEmail").value
	};

	var sender = new XMLHttpRequest();
	sender.addEventListener( "load", callback_new_group );
	sender.open( "POST", "api/groups.py" );
	sender.send(JSON.stringify(payload));
}

function callback_new_group()
{
	if( this.status != 200 )
	{
		showMessage( this.responseText );
	} else {
		localStorage.setItem( "authtoken", JSON.parse(this.responseText) );
		location.reload();
	}
}



function checkLoginButton()
{
	var enteredGroup = document.getElementById("txtGroupName").value;
	var enteredPassw = document.getElementById("txtGroupPwd").value;
	var lstGroupFirstMatch = document.getElementById("lstGroups").firstChild;
	
	if( lstGroupFirstMatch != null )
	{
		if( enteredGroup == lstGroupFirstMatch.value && enteredPassw.length > 0 )
		{
			document.getElementById("btnGroupLogin").disabled = false;
		} else {
			document.getElementById("btnGroupLogin").disabled = true;
		}
	}
	
	var foundGroup = false;
	allGroups = document.getElementById("lstGroups").children;
	for( var element in allGroups )
	{
		dom = allGroups[ element ];
		if( dom.value == enteredGroup )
		{
			foundGroup = true;
			break;
		}
	}
}

function updateGroupList()
{
	var searchterm = document.getElementById( "txtGroupName" ).value;

	var searchgroups = groups.filter(function(group) {
		var sanitized = group.toLowerCase().trim();
		if( sanitized.includes( searchterm.toLowerCase().trim() ) )
		{
			return true;
		} else {
			return false;
		}
	});

	killAllChildren( document.getElementById("lstGroups") );
	for( var groupnum in searchgroups )
	{
		group = searchgroups[ groupnum ];
		newNode = document.createElement("option");
		newNode.value = group;
		document.getElementById("lstGroups").appendChild(newNode);
	}

}

function killAllChildren( domElement )
{
	while( domElement.firstChild )
	{
		domElement.removeChild(domElement.firstChild);
	}
}

function btnGroupLogin_Click()
{
	username = document.getElementById("txtGroupName").value;
	password = hash_password(document.getElementById("txtGroupPwd").value);

	payload = {
		"action": "login",
		"username": username,
		"password": password
	};

	var request = new XMLHttpRequest();
	    request.addEventListener( "load", parseLogin );
	    request.open("POST", "api/auth.py");
	    request.send(JSON.stringify(payload));
}

function btnLogout_Click() {
	localStorage.removeItem('authtoken');
	location.reload();
}

function parseLogin()
{
	if( this.status == 200 )
	{
		localStorage.setItem( "authtoken", JSON.parse(this.responseText) );
		showMessage( "You are logged in ");
		document.getElementById("login").style.display = 'none';
		document.getElementById("keysubmit").style.display = 'block';

		fetchGroupStatus();
	} else {
		showMessage( this.responseText );
	}
}

messageTimeout = null;

function showMessage( message, messagetype, timeout )
{
	messagedom = document.getElementById("message");
	if( messagetype == "danger" )
	{
		messagedom.style.background = "rgb(255,0,0)";
		messagedom.style.color = "rgb(255,255,255)";
	} else if( messagetype == "warning" )
	{
		messagedom.style.background = "rgb(255,255,0)";
		messagedom.style.color = "rgb(0,0,0)";
	} else if( messagetype == "safe" ) {
		messagedom.style.background = "rgb(0,255,0)";
		messagedom.style.color = "rgb(0,0,0)";
	} else {
		messagedom.style.background = "rgb(128,0,128)";
		messagedom.style.color = "rgb(0,0,0)";
	}

	closeblock = " <span class=\"clickable\" onClick=\"hideMessage();\">[&times]</span>";

	messagedom.innerHTML = message + closeblock;
	messagedom.style.display = "block";

	if( messageTimeout != null) {
		clearTimeout( messageTimeout );
	}

	if(typeof(timeout) == "undefined")
	{
		numchar = message.length;
		timeout = 120 * numchar;
	}
	messageTimeout = setTimeout( hideMessage, timeout );
}

function hideMessage()
{
	clearTimeout( messageTimeout );
	messageTimeout = null;
	document.getElementById("message").style.display = "none";
	document.getElementById("message").innerHTML = "";
}

function checkLoginState()
{
	var authtoken = localStorage.getItem( "authtoken" );
	if( authtoken != null ) //Authtoken exists
	{
		document.querySelectorAll("#login input").forEach(function(a) {a.disabled = true;});
		var payload = {"action": "authtoken", "token": authtoken };
		var validator = new XMLHttpRequest();
		    validator.addEventListener( "load", parseAuthToken );
		    validator.open( "POST", "api/auth.py" );
		    validator.send( JSON.stringify( payload ) );

		document.getElementById( "btnKeySubmit" ).disabled = true;
	} else { //No Authtoken exists
		document.querySelectorAll("#login input").forEach(function(a) {a.disabled = false;});
		document.getElementById("txtGroupName").disabled = false;
		document.getElementById("txtGroupName").focus();
		document.getElementById("txtGroupPwd").disabled = false;
		document.getElementById("login").style.display = 'block';
		document.getElementById("keysubmit").style.display = 'none';

		var fetchScoreboard = new XMLHttpRequest();
		fetchScoreboard.addEventListener( "load", parseScoreboard );
		fetchScoreboard.open( "GET", "api/score.py" );
		fetchScoreboard.send();
	}
}

function parseScoreboard()
{
	if( this.status != 200 )
	{
		throw "Could not fetch scoreboard";
	}
	try
	{
		scores = JSON.parse( this.responseText );
		showScoreboard( scores );
	}
	catch(e)
	{
		alert("Could not parse scoreboard");
	}
}

function parseAuthToken()
{
	if( this.status == 200 ) //Authtoken is valid
	{
		document.getElementById("login").style.display = 'none';
		document.getElementById("keysubmit").style.display = 'block';
		document.getElementById("txtKeySubmit").focus();

		fetchGroupStatus();
	} else { //Authtoken is not valid, force login.
		console.log( "Forcing Login" );

		localStorage.removeItem( "authtoken" );

		document.getElementById("login").style.display = 'block';
		document.getElementById("keysubmit").style.display = 'none';
		document.querySelectorAll("#login input").forEach(function(a) {a.disabled = false;});
		document.getElementById("txtGroupName").focus();
		
	}
}

function txtKeySubmit_Keyup()
{
	if( document.getElementById( "txtKeySubmit" ).value.length < 1 )
	{
		document.getElementById( "btnKeySubmit" ).disabled = true;
	} else {
		if( event.keyCode == 13 )
		{
			btnKeySubmit_Click();
		}

		if( event.keyCode == 27 )
		{
			hideMessage();
		}
		document.getElementById( "btnKeySubmit" ).disabled = false;
	}
}

function btnKeySubmit_Click()
{	var key = document.getElementById("txtKeySubmit").value.trim();
	var payload = {"action": "submitkey",
		"authtoken": localStorage.getItem("authtoken"),
		"key": key};

	var sender = new XMLHttpRequest();
	    sender.addEventListener( "load", parseKeySubmit );
	    sender.open( "POST", "api/key.py" );
	    sender.send( JSON.stringify( payload ) );

	document.getElementById("txtKeySubmit").disabled = true;
	document.getElementById("btnKeySubmit").disabled = true;
}

function parseKeySubmit()
{
	document.getElementById("txtKeySubmit").disabled = false;
	document.getElementById("btnKeySubmit").disabled = false;

	if( this.status == 200 ) //A correct key was supplied
	{
		showMessage( "A correct key was supplied" );
		document.getElementById( "txtKeySubmit" ).value = "";
		fetchGroupStatus();
	} else {
		try
		{
			parsed = JSON.parse( this.responseText );
			groupstatus( parsed );
			showMessage( "That key was incorrect" );
		}
		catch(SyntaxError) {
			showMessage( this.responseText );
		}
	}

	document.getElementById("txtKeySubmit").focus();
	document.getElementById("txtKeySubmit").select();
}

function fetchGroupStatus()
{
	var payload = {"action": "groupstatus", "authtoken": localStorage.getItem("authtoken") };

	var fetcher = new XMLHttpRequest();
	    fetcher.addEventListener( "load", parseGroupStatus );
	    fetcher.open( "POST", "api/key.py" );
	    fetcher.send( JSON.stringify( payload ) );
}

function parseGroupStatus()
{
	parsed = JSON.parse( this.responseText );
	groupstatus( parsed );
}

tmrGroupStatus = null;
function groupstatus(new_status)
{
	if( tmrGroupStatus )
	{
		clearTimout( tmrGroupStatus );
		tmrGroupStatus = null;
	}

	tmrGropuStatus = setTimeout( fetchGroupStatus, 60000 );
	showScoreboard(new_status.points);

	var groupscore = new_status.points.filter(function(a) { return a.name == new_status.group; } );
	if(groupscore.length == 0)
	{
		groupscore = 0;
	} else {
		groupscore = groupscore[0].score;
	}

	showScoreboard(new_status.points);
	document.getElementById("lblGroupScore").innerHTML = groupscore;
	document.getElementById("lblWrongCounter").innerHTML = new_status.remain_guess;

	var nextguess = new Date(new_status.time_to_new_guess + " UTC");
	var nexthours = nextguess.getHours();
	if( nexthours < 10 )
	{
		nexthours = "0" + nexthours;
	}

	var nextminutes = nextguess.getMinutes();
	if( nextminutes < 10 )
	{
		nextminutes = "0" + nextminutes;
	}

	document.getElementById("lblWrongCountdown").innerHTML = nexthours + ":" + nextminutes;

	if( new_status.remain_guess == 3 )
	{
		document.getElementById( "nextGuess" ).style.display = 'none';
	} else {
		document.getElementById( "nextGuess" ).style.display = 'block';
	}

	if( new_status.remain_guess < 1 )
	{
		document.getElementById( "btnKeySubmit" ).disabled = true;
		document.getElementById( "txtKeySubmit" ).disabled = true;
	} else {
		if( document.getElementById( "txtKeySubmit" ).value.length < 1 )
		{
			document.getElementById( "btnKeySubmit" ).disabled = true;
		} else {
			document.getElementById( "btnKeySubmit" ).disabled = false;
		}
		document.getElementById( "txtKeySubmit" ).disabled = false;
		document.getElementById( "txtKeySubmit" ).focus();
	}

}

function showScoreboard(scores)
{
	scores.sort(function (a,b) { return b.score - a.score; } );

	killAllChildren(document.getElementById("scoreboard"));

	for( var pos in scores )
	{
		group = scores[ pos ];
		container = document.createElement("div");
		container.classList.add("score-item");

		groupname = document.createElement("div");
		groupname.innerHTML = group.name;
		groupname.classList.add("name");

		points = document.createElement("div");
		points.innerHTML = group.score;
		points.classList.add("score");

		container.appendChild(groupname);
		container.appendChild(points);

		document.getElementById("scoreboard").appendChild(container);
	}
}

document.querySelectorAll("form").forEach(function(element) {
	element.addEventListener("submit", function(e) {
		e.preventDefault();
		return false;
	});
});

checkLoginState();
fetchGroups();
