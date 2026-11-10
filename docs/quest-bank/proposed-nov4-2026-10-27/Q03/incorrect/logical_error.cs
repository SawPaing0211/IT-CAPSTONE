using System;
public class Solution {
 public static void Run() {
  string[] tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);
  long[] v=Array.ConvertAll(tokens,long.Parse);
  Console.WriteLine(v[0]*(v[0]+1)/2);
 }
}
