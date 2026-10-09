package com.akashbahai.researchradar;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.view.WindowInsets;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Only packaged code runs in this WebView. External pages open in the browser. */
public final class MainActivity extends ComponentActivity {
 private static final String ORIGIN = "https://appassets.androidplatform.net";
 private static final String HOME = ORIGIN + "/assets/index.html";
 private WebView web;
 private String pendingText;
 private static final int SAVE_DOCUMENT = 81;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  FrameLayout root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(16,43,64));
  web = new WebView(this); root.addView(web, new FrameLayout.LayoutParams(-1,-1)); setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)-> {
   if(android.os.Build.VERSION.SDK_INT >= 30) {
    android.graphics.Insets bar = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
    v.setPadding(bar.left,bar.top,bar.right,bar.bottom);
   } else { v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom()); }
   return insets;
  });
  WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setJavaScriptCanOpenWindowsAutomatically(false); s.setSupportMultipleWindows(false);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient() {
   @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    Uri u=request.getUrl();
    if ("appassets.androidplatform.net".equals(u.getHost()) && "https".equals(u.getScheme())) {
     WebResourceResponse response=loader.shouldInterceptRequest(u);
     if(response!=null) {
      java.util.Map<String,String> headers=new java.util.HashMap<>();
      headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://raw.githubusercontent.com; frame-src 'none'; object-src 'none'; base-uri 'self'");
      response.setResponseHeaders(headers); return response;
     }
    }
    if ("https".equals(u.getScheme()) && "raw.githubusercontent.com".equals(u.getHost()) && "/akashbahai/test/master/research-radar/events.json".equals(u.getPath())) return null;
    return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",null,new java.io.ByteArrayInputStream(new byte[0]));
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    String url=request.getUrl().toString();
    if(url.equals(ORIGIN+"/assets/")){view.loadUrl(HOME);return true;}
    if(url.equals(HOME) || url.startsWith(HOME+"#") || url.equals(ORIGIN+"/assets/privacy.html")) return false;
    if(request.isForMainFrame()) openExternal(url);
    return true;
   }
   @Override public void onPageFinished(WebView view,String url) {
    if(url.startsWith(ORIGIN+"/assets/")) view.evaluateJavascript("document.addEventListener('click',function(e){const a=e.target.closest('a');if(a && /^https?:/.test(a.href) && !a.href.startsWith(location.origin+'/')){e.preventDefault();RadarAndroid.openExternal(a.href);}},true);",null);
   }
  });
  web.setWebChromeClient(new WebChromeClient());
  web.addJavascriptInterface(new Bridge(),"RadarAndroid");
  if(state!=null) pendingText=state.getString("pendingExport");
  if(state==null || web.restoreState(state)==null) web.loadUrl(HOME);
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
   @Override public void handleOnBackPressed(){goBack();}
  });
 }
 private void openExternal(String url) {
  Uri uri=Uri.parse(url); if(!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme())) return;
  runOnUiThread(()->{try {startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(android.content.ActivityNotFoundException ex){Toast.makeText(this,"No browser installed",Toast.LENGTH_SHORT).show();}});
 }
 public final class Bridge {
  @JavascriptInterface public void openExternal(String url) { MainActivity.this.openExternal(url); }
  @JavascriptInterface public void saveFile(String text,String filename,String mime) {
   if(text==null || text.length()>1000000) return;
   final boolean csv="research-radar-events.csv".equals(filename);
   if(!csv && !"research-radar-deadlines.ics".equals(filename)) return;
   runOnUiThread(()->{
    if(pendingText!=null) {Toast.makeText(MainActivity.this,"Finish the current export first",Toast.LENGTH_SHORT).show();return;}
    pendingText=text;
    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(csv?"text/csv":"text/calendar").putExtra(Intent.EXTRA_TITLE,filename);
    try{startActivityForResult(intent,SAVE_DOCUMENT);}catch(android.content.ActivityNotFoundException ex){pendingText=null;Toast.makeText(MainActivity.this,"File picker unavailable",Toast.LENGTH_SHORT).show();}
   });
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data) {
  super.onActivityResult(request,result,data);
  if(request!=SAVE_DOCUMENT) return;
  String text=pendingText; pendingText=null;
  if(result!=RESULT_OK || data==null || data.getData()==null || text==null) return;
  try(OutputStream out=getContentResolver().openOutputStream(data.getData())) {
   if(out==null) throw new java.io.IOException("No output stream");
   out.write(text.getBytes(StandardCharsets.UTF_8));
   Toast.makeText(this,"Export saved",Toast.LENGTH_SHORT).show();
  } catch(Exception e){Toast.makeText(this,"Could not save export. Please try again.",Toast.LENGTH_LONG).show();}
 }
 private void goBack() {
  web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()",result->{if(!"true".equals(result)){if(web.canGoBack()) web.goBack();else finish();}});
 }
 @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);web.saveState(state);state.putString("pendingExport",pendingText);}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onPause(){if(web!=null)web.onPause();super.onPause();}
 @Override protected void onDestroy(){web.removeJavascriptInterface("RadarAndroid");web.destroy();super.onDestroy();}
}
