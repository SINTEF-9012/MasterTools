using System;
using System.Collections.Generic;

namespace Arma2MasterConnector
{
    class LatLngInterpolation
    {
        public class Point
        {
            public double Lat;
            public double Lng;
            public double X;
            public double Y;
        }

        // No navigable map in C# :/
        protected List<Point> Points = new List<Point>();

        public void AddPoint(double lat, double lng, double x, double y)
        {
            Points.Add(new Point
                {
                    Lat = lat,
                    Lng = lng,
                    X = x,
                    Y = y
                });
        }

        public void AddPoint(Point p)
        {
            Points.Add(p);
        }

        public Point ToLatLng(double x, double y)
        {
            Point pointXSup = null,
                pointXInf = null,
                pointYSup = null,
                pointYInf = null;

            // Looking for nearest points in O(n)
            foreach (var point in Points)
            {
                if (point.X < x && (pointXInf == null || point.X > pointXInf.X))
                {
                    pointXInf = point;
                }
                if (point.X > x && (pointXSup == null || point.X < pointXSup.X))
                {
                    pointXSup = point;
                }
                if (point.Y < y && (pointYInf == null || point.Y > pointYInf.Y))
                {
                    pointYInf = point;
                }
                if (point.Y > y && (pointYSup == null || point.Y < pointYSup.Y))
                {
                    pointYSup = point;
                }
            }

            if (pointXSup == null || pointXInf == null || pointYInf == null || pointYSup == null)
            {
                throw new Exception("LatLngInterpolation: X and Y out of bounds");
            }

            return new Point
                {
                    X = x,
                    Y = y,
                    // Linear interpolation
                    Lng = pointXInf.Lng + (x - pointXInf.X) * ((pointXSup.Lng - pointXInf.Lng) / (pointXSup.X - pointXInf.X)),
                    Lat = pointYInf.Lat + (y - pointYInf.Y) * ((pointYSup.Lat - pointYInf.Lat) / (pointYSup.Y - pointYInf.Y))
                };
        }

        public Point ToXY(double lat, double lng)
        {
            Point pointLatSup = null,
                pointLatInf = null,
                pointLngSup = null,
                pointLngInf = null;

            // Looking for nearest points in O(n)
            foreach (var point in Points)
            {
                if (point.Lat < lat && (pointLatInf == null || point.Lat > pointLatInf.Lat))
                {
                    pointLatInf = point;
                }
                if (point.Lat > lat && (pointLatSup == null || point.Lat < pointLatSup.Lat))
                {
                    pointLatSup = point;
                }
                if (point.Lng < lng && (pointLngInf == null || point.Lng > pointLngInf.Lng))
                {
                    pointLngInf = point;
                }
                if (point.Lng > lng && (pointLngSup == null || point.Lng < pointLngSup.Lng))
                {
                    pointLngSup = point;
                }
            }

            if (pointLatSup == null || pointLatInf == null || pointLngInf == null || pointLngSup == null)
            {
                throw new Exception("LatLngInterpolation: X and Y out of bounds");
            }

            return new Point
            {
                Lat = lat,
                Lng = lng,
                // Linear interpolation
                X = pointLatInf.X + (lng - pointLatInf.Lng) * ((pointLatSup.X - pointLatInf.X) / (pointLatSup.Lng - pointLatInf.Lng)),
                Y = pointLngInf.Y + (lat - pointLngInf.Lat) * ((pointLngSup.Y - pointLngInf.Y) / (pointLngSup.Lat - pointLngInf.Lat))
            };
        }
    }
}
