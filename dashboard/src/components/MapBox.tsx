import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons
const restaurantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const driverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

// Helper component to fly the map to a new position
const MapFlyTo = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    React.useEffect(() => {
        if (center) {
            map.flyTo(center, 14, { animate: true });
        }
    }, [center, map]);
    return null;
};

interface MapBoxProps {
    center?: [number, number];
    markers?: {
        id: string;
        lat: number;
        lng: number;
        type: 'restaurant' | 'driver';
        title: string;
        details?: string;
        phone?: string;
    }[];
}

export const MapBox: React.FC<MapBoxProps> = ({ center = [-17.8252, 31.0335], markers = [] }) => {
    return (
        <MapContainer 
            center={center} 
            zoom={13} 
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles"
            />
            
            <MapFlyTo center={center} />

            {markers.map((marker) => (
                <Marker 
                    key={marker.id} 
                    position={[marker.lat, marker.lng]} 
                    icon={marker.type === 'restaurant' ? restaurantIcon : driverIcon}
                >
                    <Popup>
                        <div className="p-1">
                            <p className="font-bold text-sm m-0">{marker.title}</p>
                            {marker.details && <p className="text-xs text-slate-500 m-0 mt-1">{marker.details}</p>}
                            {marker.phone && (
                                <p className="text-xs font-bold text-orange-600 m-0 mt-2">
                                    📞 {marker.phone}
                                </p>
                            )}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};
