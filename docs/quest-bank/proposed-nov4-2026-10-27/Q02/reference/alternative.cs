using System;
public class Solution {
 public static void Run() {
  string[] tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);
  long[] v=Array.ConvertAll(tokens,long.Parse);
  long best=v[0]; for(int i=1;i<3;i++) if(v[i]>best) best=v[i]; Console.WriteLine(best);
 }
}
