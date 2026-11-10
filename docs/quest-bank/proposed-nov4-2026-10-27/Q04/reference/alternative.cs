using System;
public class Solution {
 public static void Run() {
  string[] tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);
  long[] v=Array.ConvertAll(tokens,long.Parse);
  long sum=0; foreach(char c in Math.Abs(v[0]).ToString()) sum+=c-'0'; Console.WriteLine(sum);
 }
}
