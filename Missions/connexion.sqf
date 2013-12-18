//removeAllWeapons player;

/*_groupe = group secondlapin;
_wp = _groupe addWaypoint [[14111.8,16000.5,50],0];
_wp setWaypointType "MOVE";

_wp2 = _groupe addWaypoint [getPos(player),0];
_wp2 setWaypointType "CYCLE";*/

hint("Arma2Net.Unmanaged" callExtension "Reload");

// INIT:hostname:port:lat:lng
"Arma2Net.Unmanaged" callExtension "Arma2Master INIT:localhost:7845:59.944821:10.712956";

while {(true)} do
{
	data = [];

	{ data = data + [[_x]+getPos(_x)+(velocity _x)+[getDir(_x),getDammage(_x),getFatigue(_x),(fuel _x)]] } forEach allUnits;
	
	_a = "Arma2Net.Unmanaged" callExtension format ["Arma2Master %1", data];
	
	switch(_a) do
	{
		case "nop":
		{
			// do nothing
		};

		case "connected":
		{
			hintSilent "Connected"
		};

		default
		{
			// Execute the string
			call compile _a;
		};
	};
	
	sleep 0.5;
	
};