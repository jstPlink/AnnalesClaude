package it.fplinio.annales;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // i plugin locali vanno registrati PRIMA di super.onCreate (Capacitor li carica lì)
        registerPlugin(AppPermissionsPlugin.class);
        registerPlugin(AnnalesWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
