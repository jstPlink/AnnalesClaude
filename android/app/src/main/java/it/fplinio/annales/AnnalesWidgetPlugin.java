package it.fplinio.annales;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte fra l'app e il widget 3x1 (AnnalesSummaryWidget): il frontend manda un riepilogo
 * (mood giornaliero degli ultimi giorni, ultima nota, gradiente del mood) e il widget lo mostra.
 * Vedi src/lib/widgetSync.js.
 */
@CapacitorPlugin(name = "AnnalesWidget")
public class AnnalesWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context c = getContext();
        c.getSharedPreferences(AnnalesSummaryWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(AnnalesSummaryWidget.KEY_DATA, call.getData().toString())
            .apply();
        AnnalesSummaryWidget.updateAll(c);
        call.resolve();
    }
}
