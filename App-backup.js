
import { useState, useEffect, useRef } from "react";
import { FlatList, StyleSheet, View, Alert } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as SQLite from "expo-sqlite";

import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";

import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";

export default function App() {
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState([]);

  // Referência para o banco de dados
  const dbRef = useRef(null);

  // Configuração do tema
  const [theme, setTheme] = useState({
    ...DefaultTheme,
    myOwnProperty: true,
    colors: myColors.colors,
  });

  // PRIMEIRA FUNCIONALIDADE: ASYNC STORAGE

  // Carregar tema salvo
  async function loadDarkMode() {
    try {
      const savedDarkMode = await AsyncStorage.getItem("darkMode");

      if (savedDarkMode !== null) {
        setIsSwitchOn(savedDarkMode === "true");
      }
    } catch (error) {
      console.log("Erro ao carregar o tema:", error);
    }
  }

  // Salvar preferência do tema
  async function onToggleSwitch() {
    const newValue = !isSwitchOn;

    setIsSwitchOn(newValue);

    try {
      await AsyncStorage.setItem("darkMode", String(newValue));
    } catch (error) {
      console.log("Erro ao salvar o tema:", error);
    }
  }

  // TERCEIRA FUNCIONALIDADE: SQLITE

  // Criar banco e tabela
  async function initializeDatabase() {
    try {
      const db = await SQLite.openDatabaseAsync("locations.db");

      dbRef.current = db;

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          createdAt TEXT NOT NULL
        );
      `);

      console.log("Banco de dados criado com sucesso!");

      await loadLocations();

    } catch (error) {
      console.log("Erro ao inicializar o banco:", error);
      Alert.alert("Erro", "Não foi possível abrir o banco de dados.");
    }
  }

  // Recuperar localizações salvas
  async function loadLocations() {
    try {
      if (!dbRef.current) return;

      const result = await dbRef.current.getAllAsync(
        "SELECT * FROM locations ORDER BY id DESC"
      );

      setLocations(result);

    } catch (error) {
      console.log("Erro ao carregar localizações:", error);
    }
  }

  // Salvar nova localização no SQLite
  async function saveLocation(coords) {
    try {
      await dbRef.current.runAsync(
        `INSERT INTO locations (latitude, longitude, createdAt)
         VALUES (?, ?, ?)`,
        coords.latitude,
        coords.longitude,
        new Date().toISOString()
      );

      console.log("Localização salva com sucesso!");

      await loadLocations();

    } catch (error) {
      console.log("Erro ao salvar localização:", error);
      Alert.alert("Erro", "Não foi possível salvar a localização.");
    }
  }

  // SEGUNDA FUNCIONALIDADE: EXPO LOCATION

  // Capturar localização real do dispositivo
  async function getLocation() {
    try {
      if (!dbRef.current) {
        Alert.alert("Aguarde", "O banco de dados ainda está carregando.");
        return;
      }

      setIsLoading(true);

      // Solicitar permissão
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permissão negada",
          "Precisamos da sua autorização para acessar a localização."
        );
        return;
      }

      // Capturar localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log("Localização capturada:", coords);

      // Salvar localização no banco de dados
      await saveLocation(coords);

      Alert.alert("Sucesso", "Localização salva com sucesso!");

    } catch (error) {
      console.log("Erro ao capturar localização:", error);
      Alert.alert("Erro", "Não foi possível capturar a localização.");
    } finally {
      setIsLoading(false);
    }
  }

  // Carregar dados ao abrir o aplicativo
  useEffect(() => {
    loadDarkMode();
    initializeDatabase();
  }, []);

  // Atualizar tema
  useEffect(() => {
    if (isSwitchOn) {
      setTheme({
        ...DefaultTheme,
        colors: myColorsDark.colors,
      });
    } else {
      setTheme({
        ...DefaultTheme,
        colors: myColors.colors,
      });
    }
  }, [isSwitchOn]);

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="My Location BASE" />
      </Appbar.Header>

      <View
        style={{
          backgroundColor: theme.colors.background,
          flex: 1,
        }}
      >
        {/* Dark Mode */}
        <View style={styles.containerDarkMode}>
          <Text>Dark Mode</Text>

          <Switch
            value={isSwitchOn}
            onValueChange={onToggleSwitch}
          />
        </View>

        {/* Botão de localização */}
        <Button
          style={styles.containerButton}
          icon="map"
          mode="contained"
          loading={isLoading}
          disabled={isLoading}
          onPress={getLocation}
        >
          Capturar localização
        </Button>

        {/* Lista de localizações */}
        <FlatList
          style={styles.containerList}
          data={locations}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <List.Item
              title={`Localização ${item.id}`}
              description={
                `Latitude: ${item.latitude}\n` +
                `Longitude: ${item.longitude}\n` +
                `Data: ${new Date(item.createdAt).toLocaleString("pt-BR")}`
              }
              left={(props) => (
                <List.Icon {...props} icon="map-marker" />
              )}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhuma localização salva.
            </Text>
          }
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  containerButton: {
    margin: 10,
  },

  containerList: {
    margin: 10,
    flex: 1,
  },

  emptyText: {
    margin: 15,
    textAlign: "center",
  },
});
