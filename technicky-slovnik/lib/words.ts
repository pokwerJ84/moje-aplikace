export type Word = {id:string; cs:string; en:string; ja:string; description:string; imageKey:string|null};
export const initialWords: Word[] = [
['voltage','Napětí','Voltage','den’atsu','Elektrické napětí je rozdíl elektrických potenciálů. Jednotka: volt (V). Při měření ventilátoru sleduješ například napájecí a rozběhové napětí.'],
['current','Proud','Current','denryū','Elektrický proud vyjadřuje tok elektrického náboje. Jednotka: ampér (A), často miliampér (mA). U ventilátoru sleduješ proud, který odebírá.'],
['speed','Otáčky / rychlost otáčení','Speed (rotational speed)','kaiten sokudo','Rychlost otáčení rotoru. Běžně se uvádí v otáčkách za minutu: rpm nebo r/min. Obecná rychlost se japonsky řekne sokudo.'],
['measurement','Měření','Measurement','sokutei','Zjištění hodnoty veličiny pomocí měřicího přístroje. U ventilátoru měříš například napětí, proud, otáčky nebo hluk.'],
['power-supply','Napájecí zdroj','Power supply','dengen','Zdroj elektrického napájení. Laboratorní zdroj umožňuje nastavit napětí a obvykle také omezit proud.'],
['tachometer','Otáčkoměr','Tachometer','kaitenkei','Přístroj pro měření otáček. Optický otáčkoměr obvykle snímá odraz od značky na rotujícím dílu. Používá se také název takomētā.'],
['multimeter','Multimetr','Multimeter','maruchimētā','Přístroj s více měřicími funkcemi, například pro napětí, proud a odpor. Podle měření se volí funkce a správné zdířky pro měřicí kabely.'],
['connection','Zapojení / připojení','Connection','setsuzoku','Spojení vodičů, přístrojů nebo součástek. V elektrickém měření jde například o připojení ventilátoru ke zdroji.'],
['pq','Průtokově-tlaková charakteristika','P–Q characteristic','fūryō–seiatsu tokusei','Křivka vztahu mezi průtokem vzduchu Q a statickým tlakem P ventilátoru. Ukazuje, jak se mění průtok při různém odporu proudění.'],
['noise','Hluk','Noise (acoustic)','sōon','Zvuk vydávaný ventilátorem. Jeho hladina se často uvádí v dB(A). Elektrický šum je jiný význam anglického noise a japonsky se označuje noizu.']
].map(([id,cs,en,ja,description])=>({id,cs,en,ja,description,imageKey:null}));
