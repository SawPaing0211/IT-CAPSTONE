using System;
public class Solution {
 public static void Run() {
  string[] tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);
  long[] v=Array.ConvertAll(tokens,long.Parse);
  long n=v[0],s=0; while(n>0){s+=n%10;n/=10;} Console.WriteLine(s);
 }
}
