'use client';

// Fluffini Admin - React Native Expo App
// Kompletní administrační aplikace
// Autor: Michal Schneider, 2026

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  Switch,
  FlatList,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ===== KONSTANTY =====
const API_BASE = 'https://CHANGE_ME/api';

const COLORS = {
  primary: '#7c3aed',
  primaryDark: '#5b21b6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  light: '#f8fafc',
  dark: '#1e293b',
  text: '#334155',
  textLight: '#64748b',
  border: '#e2e8f0',
  background: '#f1f5f9',
  white: '#ffffff',
};

const CATEGORIES = {
  zviratka: 'Zvířátka',
  dekoration: 'Dekorace',
  obleceni: 'Oblečení',
  ostatni: 'Ostatní',
};

const MENU_ITEMS = [
  { id: 'dashboard', title: 'Dashboard', icon: 'speedometer' },
  { id: 'orders', title: 'Objednávky', icon: 'cart' },
  { id: 'products', title: 'Produkty', icon: 'cube' },
  { id: 'stock', title: 'Sklad', icon: 'archive' },
  { id: 'emails', title: 'Emaily', icon: 'mail' },
  { id: 'messages', title: 'Zprávy', icon: 'chatbubbles' },
  { id: 'server', title: 'O serveru', icon: 'server' },
  { id: 'alerts', title: 'Upozornění', icon: 'notifications' },
  { id: 'reviews', title: 'Recenze', icon: 'star' },
  { id: 'analytics', title: 'Analytika', icon: 'analytics' },
  { id: 'settings', title: 'Nastavení', icon: 'settings' },
];

// ===== HLAVNÍ APLIKACE =====
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarVisible, setSidebarVisible] = useState(isWeb && width > 992);
  const [loading, setLoading] = useState(true);

  // Check login status on mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('fluffini_admin_token');
      const user = await AsyncStorage.getItem('fluffini_admin_user');
      
      if (token && user) {
        setCurrentToken(token);
        setCurrentUser(JSON.parse(user));
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (token, user) => {
    try {
      await AsyncStorage.setItem('fluffini_admin_token', token);
      await AsyncStorage.setItem('fluffini_admin_user', JSON.stringify(user));
      setCurrentToken(token);
      setCurrentUser(user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error saving login data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (currentToken) {
        fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        }).catch(console.error);
      }
      
      await AsyncStorage.removeItem('fluffini_admin_token');
      await AsyncStorage.removeItem('fluffini_admin_user');
      setCurrentToken(null);
      setCurrentUser(null);
      setIsLoggedIn(false);
      setActiveSection('dashboard');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Načítání...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      
      {/* Sidebar for web/tablet */}
      {sidebarVisible && (
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            if (width <= 992) setSidebarVisible(false);
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onClose={() => setSidebarVisible(false)}
        />
      )}
      
      {/* Main content */}
      <View style={[styles.mainContent, sidebarVisible && isWeb && width > 992 && styles.mainContentWithSidebar]}>
        <Header
          title={MENU_ITEMS.find(item => item.id === activeSection)?.title || 'Dashboard'}
          onMenuPress={() => setSidebarVisible(!sidebarVisible)}
          onLogout={handleLogout}
        />
        
        <MainContent
          section={activeSection}
          token={currentToken}
          onSectionChange={setActiveSection}
        />
      </View>
      
      {/* Bottom tab bar for mobile */}
      {!isWeb && (
        <BottomTabBar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      )}
    </SafeAreaView>
  );
}

// ===== PŘIHLAŠOVACÍ OBRAZOVKA =====
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Vyplňte všechna pole');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Nesprávné přihlašovací údaje');
      }

      const data = await response.json();
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Chyba při přihlášení');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginBox}>
        <View style={styles.loginHeader}>
          <Ionicons name="lock-closed" size={40} color={COLORS.primary} />
          <Text style={styles.loginTitle}>CHANGE_ME Administrace</Text>
          <Text style={styles.loginSubtitle}>Přihlaste se pro správu e-shopu</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Uživatelské jméno</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Heslo</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.loginBtnText}>Přihlásit se</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.demoText}>
          Demo přihlašovací údaje: na požádání u Michala
        </Text>
      </View>
    </View>
  );
}

// ===== SIDEBAR =====
function Sidebar({ activeSection, onSectionChange, currentUser, onLogout, onClose }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.logo}>
          <Ionicons name="trophy" size={28} color={COLORS.primary} />
          <Text style={styles.logoText}>CHANGE_ME Admin</Text>
        </View>
        {!isWeb && (
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.sidebarMenu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, activeSection === item.id && styles.menuItemActive]}
            onPress={() => onSectionChange(item.id)}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={activeSection === item.id ? COLORS.white : COLORS.textLight}
            />
            <Text style={[styles.menuItemText, activeSection === item.id && styles.menuItemTextActive]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sidebarFooter}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {currentUser?.username?.charAt(0).toUpperCase() || 'A'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{currentUser?.username || 'Administrátor'}</Text>
            <Text style={styles.userRole}>
              {currentUser?.role === 'admin' ? 'Administrátor' : 'Uživatel'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtnSidebar} onPress={onLogout}>
          <Ionicons name="log-out" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ===== HEADER =====
function Header({ title, onMenuPress, onLogout }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out" size={18} color={COLORS.white} />
        <Text style={styles.logoutBtnText}>Odhlásit</Text>
      </TouchableOpacity>
    </View>
  );
}

// ===== BOTTOM TAB BAR =====
function BottomTabBar({ activeSection, onSectionChange }) {
  const visibleTabs = MENU_ITEMS.slice(0, 5);

  return (
    <View style={styles.bottomTabBar}>
      {visibleTabs.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.tabItem, activeSection === item.id && styles.tabItemActive]}
          onPress={() => onSectionChange(item.id)}
        >
          <Ionicons
            name={item.icon}
            size={22}
            color={activeSection === item.id ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.tabLabel, activeSection === item.id && styles.tabLabelActive]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ===== HLAVNÍ OBSAH =====
function MainContent({ section, token, onSectionChange }) {
  switch (section) {
    case 'dashboard':
      return <DashboardSection token={token} onSectionChange={onSectionChange} />;
    case 'orders':
      return <OrdersSection token={token} />;
    case 'products':
      return <ProductsSection token={token} />;
    case 'stock':
      return <StockSection token={token} />;
    case 'emails':
      return <EmailsSection token={token} />;
    case 'messages':
      return <MessagesSection token={token} />;
    case 'server':
      return <ServerSection token={token} />;
    case 'alerts':
      return <AlertsSection token={token} />;
    case 'reviews':
      return <ReviewsSection token={token} />;
    case 'analytics':
      return <AnalyticsSection token={token} />;
    case 'settings':
      return <SettingsSection token={token} />;
    default:
      return <DashboardSection token={token} onSectionChange={onSectionChange} />;
  }
}

// ===== DASHBOARD SEKCE =====
function DashboardSection({ token, onSectionChange }) {
  const [stats, setStats] = useState({ income: 0, orders: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [orders, products] = await Promise.all([
        fetchData(`${API_BASE}/orders`, token),
        fetchData(`${API_BASE}/products`, token),
      ]);

      const totalIncome = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      setStats({
        income: totalIncome,
        orders: orders.length,
        products: products.length,
      });
      
      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showNotification('Chyba při načítání dat', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats cards */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="cash"
          iconBg={COLORS.secondary}
          value={formatPrice(stats.income)}
          label="Celkový výdělek"
        />
        <StatCard
          icon="bag"
          iconBg={COLORS.info}
          value={stats.orders.toString()}
          label="Celkem objednávek"
        />
        <StatCard
          icon="cube"
          iconBg={COLORS.warning}
          value={stats.products.toString()}
          label="Produktů v prodeji"
        />
      </View>

      {/* Recent orders */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Nedávné objednávky</Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => onSectionChange('orders')}
          >
            <Ionicons name="eye" size={16} color={COLORS.white} />
            <Text style={styles.btnText}>Zobrazit všechny</Text>
          </TouchableOpacity>
        </View>
        
        {recentOrders.length === 0 ? (
          <EmptyState icon="cart" message="Žádné nedávné objednávky" />
        ) : (
          <View style={styles.tableBody}>
            {recentOrders.map((order) => (
              <OrderRow key={order.id} order={order} compact />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ===== OBJEDNÁVKY SEKCE =====
function OrdersSection({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/orders`, token);
      setOrders(data);
    } catch (error) {
      showNotification('Chyba při načítání objednávek', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update');
      
      showNotification('Stav objednávky aktualizován', 'success');
      loadOrders();
      setSelectedOrder(null);
    } catch (error) {
      showNotification('Chyba při aktualizaci', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.content}>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Všechny objednávky</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadOrders}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
            <Text style={styles.btnTextSecondary}>Obnovit</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <EmptyState icon="cart" message="Žádné objednávky" />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <OrderRow
                order={item}
                onPress={() => setSelectedOrder(item)}
                onStatusChange={updateOrderStatus}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />
            }
            style={{ maxHeight: 500 }}
          />
        )}
      </View>

      {/* Order Detail Modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Objednávka #{selectedOrder?.id}
              </Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedOrder && (
                <OrderDetail
                  order={selectedOrder}
                  onStatusChange={updateOrderStatus}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== PRODUKTY SEKCE =====
function ProductsSection({ token }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/products`, token);
      setProducts(data);
    } catch (error) {
      showNotification('Chyba při načítání produktů', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaveProduct = async (productData) => {
    try {
      const url = editingProduct
        ? `${API_BASE}/products/${editingProduct.id}`
        : `${API_BASE}/products`;
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) throw new Error('Failed to save');

      showNotification(
        editingProduct ? 'Produkt upraven' : 'Produkt přidán',
        'success'
      );
      loadProducts();
      setModalVisible(false);
      setEditingProduct(null);
    } catch (error) {
      showNotification('Chyba při ukládání', 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    Alert.alert('Smazat produkt', 'Opravdu chcete smazat tento produkt?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE}/products/${productId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to delete');
            showNotification('Produkt smazán', 'success');
            loadProducts();
          } catch (error) {
            showNotification('Chyba při mazání', 'error');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.content}>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Produkty</Text>
          <View style={styles.tableActions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={loadProducts}>
              <Ionicons name="refresh" size={16} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => {
                setEditingProduct(null);
                setModalVisible(true);
              }}
            >
              <Ionicons name="add" size={16} color={COLORS.white} />
              <Text style={styles.btnText}>Přidat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {products.length === 0 ? (
          <EmptyState icon="cube" message="Žádné produkty" />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ProductRow
                product={item}
                onEdit={() => {
                  setEditingProduct(item);
                  setModalVisible(true);
                }}
                onDelete={() => handleDeleteProduct(item.id)}
              />
            )}
            style={{ maxHeight: 500 }}
          />
        )}
      </View>

      {/* Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Upravit produkt' : 'Přidat produkt'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <ProductForm
                product={editingProduct}
                onSave={handleSaveProduct}
                onCancel={() => setModalVisible(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== SKLAD SEKCE =====
function StockSection({ token }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadStock = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/products`, token);
      setProducts(data);
    } catch (error) {
      showNotification('Chyba při načítání skladu', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const updateStock = async (productId, newStock) => {
    try {
      const response = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: Math.max(0, newStock) }),
      });
      if (!response.ok) throw new Error('Failed');
      loadStock();
    } catch (error) {
      showNotification('Chyba při aktualizaci', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    let matchesFilter = true;
    if (filter === 'low') matchesFilter = p.stock < 5 && p.stock > 0;
    if (filter === 'out') matchesFilter = p.stock === 0;
    if (filter === 'in') matchesFilter = p.stock > 0;

    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = products.filter((p) => p.stock < 5 && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.content}>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Správa skladu</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadStock}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.filterButtons}>
            {[
              { id: 'all', label: 'Vše' },
              { id: 'low', label: 'Nízký stav' },
              { id: 'out', label: 'Vyprodáno' },
              { id: 'in', label: 'Na skladě' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
                onPress={() => setFilter(f.id)}
              >
                <Text style={[styles.filterBtnText, filter === f.id && styles.filterBtnTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Hledat produkt..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Summary */}
        <View style={styles.stockSummary}>
          <Text style={styles.summaryText}>Celkem: {products.length}</Text>
          <Text style={styles.summaryText}>Na skladě: {totalStock} ks</Text>
          <Text style={styles.summaryText}>Nízký stav: {lowStockCount}</Text>
          <Text style={[styles.summaryText, { color: COLORS.danger }]}>
            Vyprodáno: {outOfStockCount}
          </Text>
        </View>

        {/* Products list */}
        {filteredProducts.map((product) => (
          <StockRow
            key={product.id}
            product={product}
            onUpdateStock={updateStock}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ===== EMAILY SEKCE =====
function EmailsSection({ token }) {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [quickEmail, setQuickEmail] = useState({ to: '', subject: '', body: '' });

  const loadEmails = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/emails`, token);
      setEmails(data);
      setStats({
        total: data.length,
        success: data.filter((e) => e.status === 'sent').length,
        failed: data.filter((e) => e.status === 'failed').length,
        pending: data.filter((e) => e.status === 'pending').length,
      });
    } catch (error) {
      showNotification('Chyba při načítání emailů', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const sendQuickEmail = async () => {
    if (!quickEmail.to || !quickEmail.subject || !quickEmail.body) {
      showNotification('Vyplňte všechna pole', 'error');
      return;
    }

    try {
      const recipients = quickEmail.to.split(',').map((e) => e.trim());
      for (const recipient of recipients) {
        await fetch(`${API_BASE}/emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipient,
            subject: quickEmail.subject,
            body: quickEmail.body,
          }),
        });
      }
      showNotification(`Emaily odeslány (${recipients.length})`, 'success');
      setQuickEmail({ to: '', subject: '', body: '' });
      loadEmails();
    } catch (error) {
      showNotification('Chyba při odesílání', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.content}>
      {/* Stats */}
      <View style={styles.emailStats}>
        <View style={styles.emailStatCard}>
          <Text style={styles.emailStatNumber}>{stats.total}</Text>
          <Text style={styles.emailStatLabel}>Celkem</Text>
        </View>
        <View style={styles.emailStatCard}>
          <Text style={[styles.emailStatNumber, { color: COLORS.secondary }]}>{stats.success}</Text>
          <Text style={styles.emailStatLabel}>Úspěšné</Text>
        </View>
        <View style={styles.emailStatCard}>
          <Text style={[styles.emailStatNumber, { color: COLORS.danger }]}>{stats.failed}</Text>
          <Text style={styles.emailStatLabel}>Chybné</Text>
        </View>
        <View style={styles.emailStatCard}>
          <Text style={[styles.emailStatNumber, { color: COLORS.warning }]}>{stats.pending}</Text>
          <Text style={styles.emailStatLabel}>Čekající</Text>
        </View>
      </View>

      {/* Quick send */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Rychlé odeslání</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Komu</Text>
          <TextInput
            style={styles.input}
            placeholder="email@priklad.cz"
            value={quickEmail.to}
            onChangeText={(text) => setQuickEmail({ ...quickEmail, to: text })}
            keyboardType="email-address"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Předmět</Text>
          <TextInput
            style={styles.input}
            placeholder="Předmět emailu"
            value={quickEmail.subject}
            onChangeText={(text) => setQuickEmail({ ...quickEmail, subject: text })}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Obsah</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Text emailu..."
            value={quickEmail.body}
            onChangeText={(text) => setQuickEmail({ ...quickEmail, body: text })}
            multiline
            numberOfLines={4}
          />
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={sendQuickEmail}>
          <Ionicons name="send" size={16} color={COLORS.white} />
          <Text style={styles.btnText}>Odeslat</Text>
        </TouchableOpacity>
      </View>

      {/* Email history */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Historie emailů</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadEmails}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        {emails.length === 0 ? (
          <EmptyState icon="mail" message="Žádné emaily" />
        ) : (
          emails.slice(0, 20).map((email) => (
            <EmailRow key={email.id} email={email} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ===== ZPRÁVY SEKCE =====
function MessagesSection({ token }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/contact`, token);
      setMessages(data.sort((a, b) => new Date(b.created) - new Date(a.created)));
    } catch (error) {
      showNotification('Chyba při načítání zpráv', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const deleteMessage = async (id) => {
    Alert.alert('Smazat zprávu', 'Opravdu chcete smazat tuto zprávu?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/contact/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            showNotification('Zpráva smazána', 'success');
            loadMessages();
          } catch (error) {
            showNotification('Chyba při mazání', 'error');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.content}>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Zprávy z kontaktního formuláře</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadMessages}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {messages.length === 0 ? (
          <EmptyState icon="chatbubbles" message="Žádné zprávy" />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MessageRow
                message={item}
                onPress={() => setSelectedMessage(item)}
                onDelete={() => deleteMessage(item.id)}
              />
            )}
            style={{ maxHeight: 500 }}
          />
        )}
      </View>

      {/* Message Detail Modal */}
      <Modal visible={!!selectedMessage} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Zpráva #{selectedMessage?.id}</Text>
              <TouchableOpacity onPress={() => setSelectedMessage(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedMessage && (
                <MessageDetail message={selectedMessage} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== SERVER SEKCE =====
function ServerSection({ token }) {
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadServerInfo = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/server-info`, token);
      setServerInfo(data);
    } catch (error) {
      showNotification('Chyba při načítání informací', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadServerInfo();
  }, [loadServerInfo]);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.content}>
      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="speedometer"
          iconBg={COLORS.secondary}
          value={`${serverInfo?.cpu_percent || 0}%`}
          label="Využití CPU"
        />
        <StatCard
          icon="hardware-chip"
          iconBg={COLORS.info}
          value={`${serverInfo?.memory_percent || 0}%`}
          label="Využití RAM"
        />
        <StatCard
          icon="swap-horizontal"
          iconBg={COLORS.warning}
          value={`${serverInfo?.swap_percent || 0}%`}
          label="Využití Swap"
        />
        <StatCard
          icon="server"
          iconBg={COLORS.primary}
          value={`${serverInfo?.disk_percent || 0}%`}
          label="Využití disku"
        />
      </View>

      {/* System info */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Informace o systému</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadServerInfo}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.infoList}>
          <InfoRow label="Hostname" value={serverInfo?.hostname} />
          <InfoRow label="Systém" value={serverInfo?.system} />
          <InfoRow label="Uptime" value={serverInfo?.uptime} />
          <InfoRow label="CPU teplota" value={`${serverInfo?.cpu_temp || 'N/A'}°C`} />
          <InfoRow label="Celková RAM" value={`${serverInfo?.memory_total} MB`} />
          <InfoRow label="Volná RAM" value={`${serverInfo?.memory_free} MB`} />
          <InfoRow label="Celkový disk" value={`${serverInfo?.disk_total} GB`} />
          <InfoRow label="Volný disk" value={`${serverInfo?.disk_free} GB`} />
        </View>
      </View>

      <View style={styles.footerInfo}>
        <Text style={styles.footerText}>© Michal Schneider 2026, all rights reserved.</Text>
        <Text style={styles.footerText}>ADMINER v1.8 - GPL License</Text>
      </View>
    </ScrollView>
  );
}

// ===== UPOZORNĚNÍ SEKCE =====
function AlertsSection({ token }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState({
    title: '',
    message: '',
    priority: 'low',
    active: true,
  });

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/alerts`, token);
      setAlerts(data.sort((a, b) => new Date(b.created) - new Date(a.created)));
    } catch (error) {
      showNotification('Chyba při načítání upozornění', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const createAlert = async () => {
    if (!newAlert.title || !newAlert.message) {
      showNotification('Vyplňte nadpis a zprávu', 'error');
      return;
    }

    try {
      await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAlert),
      });
      showNotification('Upozornění vytvořeno', 'success');
      setNewAlert({ title: '', message: '', priority: 'low', active: true });
      loadAlerts();
    } catch (error) {
      showNotification('Chyba při vytváření', 'error');
    }
  };

  const deleteAlert = async (id) => {
    Alert.alert('Smazat upozornění', 'Opravdu chcete smazat?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/alerts/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            showNotification('Upozornění smazáno', 'success');
            loadAlerts();
          } catch (error) {
            showNotification('Chyba při mazání', 'error');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.content}>
      {/* Create new alert */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Vytvořit nové upozornění</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nadpis *</Text>
          <TextInput
            style={styles.input}
            value={newAlert.title}
            onChangeText={(text) => setNewAlert({ ...newAlert, title: text })}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Zpráva *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={newAlert.message}
            onChangeText={(text) => setNewAlert({ ...newAlert, message: text })}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Priorita</Text>
          <View style={styles.priorityButtons}>
            {['low', 'medium', 'high'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityBtn,
                  newAlert.priority === p && styles.priorityBtnActive,
                  { backgroundColor: p === 'low' ? COLORS.secondary : p === 'medium' ? COLORS.warning : COLORS.danger },
                ]}
                onPress={() => setNewAlert({ ...newAlert, priority: p })}
              >
                <Text style={styles.priorityBtnText}>
                  {p === 'low' ? 'Nízká' : p === 'medium' ? 'Střední' : 'Vysoká'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.formRow}>
          <Text style={styles.label}>Aktivní</Text>
          <Switch
            value={newAlert.active}
            onValueChange={(value) => setNewAlert({ ...newAlert, active: value })}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={createAlert}>
          <Ionicons name="notifications" size={16} color={COLORS.white} />
          <Text style={styles.btnText}>Vytvořit upozornění</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts list */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Aktivní upozornění</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadAlerts}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        {alerts.length === 0 ? (
          <EmptyState icon="notifications-off" message="Žádná upozornění" />
        ) : (
          alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onDelete={() => deleteAlert(alert.id)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ===== RECENZE SEKCE =====
function ReviewsSection({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    try {
      const data = await fetchData(`${API_BASE}/reviews`, token);
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification('Chyba při načítání recenzí', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const deleteReview = async (id) => {
    Alert.alert('Smazat recenzi', 'Opravdu chcete smazat?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/reviews/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            showNotification('Recenze smazána', 'success');
            loadReviews();
          } catch (error) {
            showNotification('Chyba při mazání', 'error');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.content}>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Recenze produktů</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={loadReviews}>
            <Ionicons name="refresh" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {reviews.length === 0 ? (
          <EmptyState icon="star" message="Žádné recenze" />
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ReviewRow review={item} onDelete={() => deleteReview(item.id)} />
            )}
            style={{ maxHeight: 500 }}
          />
        )}
      </View>
    </View>
  );
}

// ===== ANALYTIKA SEKCE =====
function AnalyticsSection({ token }) {
  const [data, setData] = useState({ orders: [], products: [] });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      const [orders, products] = await Promise.all([
        fetchData(`${API_BASE}/orders`, token),
        fetchData(`${API_BASE}/products`, token),
      ]);
      setData({ orders, products });
    } catch (error) {
      showNotification('Chyba při načítání analytiky', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Calculate top products
  const topProducts = React.useMemo(() => {
    const productSales = {};
    data.orders.forEach((order) => {
      order.items?.forEach((item) => {
        if (!productSales[item.id]) {
          productSales[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0 };
        }
        productSales[item.id].quantity += item.quantity;
        productSales[item.id].revenue += item.price * item.quantity;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [data.orders]);

  // Category sales
  const categorySales = React.useMemo(() => {
    const cats = { zviratka: 0, dekoration: 0, obleceni: 0, ostatni: 0 };
    data.orders.forEach((order) => {
      order.items?.forEach((item) => {
        const product = data.products.find((p) => p.id === item.id);
        if (product && cats.hasOwnProperty(product.category)) {
          cats[product.category] += item.quantity;
        }
      });
    });
    return cats;
  }, [data]);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.content}>
      {/* Category chart simplified */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Prodej podle kategorií</Text>
        <View style={styles.categoryBars}>
          {Object.entries(categorySales).map(([key, value]) => (
            <View key={key} style={styles.categoryBar}>
              <Text style={styles.categoryLabel}>{CATEGORIES[key]}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    { width: `${Math.min(100, (value / Math.max(...Object.values(categorySales))) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.categoryValue}>{value} ks</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top products */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Nejprodávanější produkty</Text>
        </View>
        {topProducts.length === 0 ? (
          <EmptyState icon="trending-up" message="Žádná data" />
        ) : (
          topProducts.map((product, index) => (
            <View key={product.id} style={styles.topProductRow}>
              <Text style={styles.topProductRank}>#{index + 1}</Text>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName}>{product.name}</Text>
                <Text style={styles.topProductStats}>
                  {product.quantity} ks • {formatPrice(product.revenue)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ===== NASTAVENÍ SEKCE =====
function SettingsSection({ token }) {
  const [settings, setSettings] = useState({
    shopName: 'Fluffíni',
    shopEmail: 'info@fluffini.cz',
    shopPhone: '+420 773 700 019',
    shopAddress: 'Za Sokolovnou, 398 01 Mirotice',
    maintenanceMode: false,
    allowRegistrations: true,
    currency: 'CZK',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '' });

  const saveSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shop_name: settings.shopName,
          shop_email: settings.shopEmail,
          contact_phone: settings.shopPhone,
          contact_address: settings.shopAddress,
          ...(passwords.new && passwords.current && {
            current_password: passwords.current,
            new_password: passwords.new,
          }),
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      showNotification('Nastavení uloženo', 'success');
      setPasswords({ current: '', new: '' });
    } catch (error) {
      showNotification('Chyba při ukládání', 'error');
    }
  };

  return (
    <ScrollView style={styles.content}>
      {/* Shop settings */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Nastavení obchodu</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Název obchodu</Text>
          <TextInput
            style={styles.input}
            value={settings.shopName}
            onChangeText={(text) => setSettings({ ...settings, shopName: text })}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>E-mail obchodu</Text>
          <TextInput
            style={styles.input}
            value={settings.shopEmail}
            onChangeText={(text) => setSettings({ ...settings, shopEmail: text })}
            keyboardType="email-address"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            value={settings.shopPhone}
            onChangeText={(text) => setSettings({ ...settings, shopPhone: text })}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Adresa</Text>
          <TextInput
            style={styles.input}
            value={settings.shopAddress}
            onChangeText={(text) => setSettings({ ...settings, shopAddress: text })}
          />
        </View>
      </View>

      {/* Password change */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Změna hesla</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Současné heslo</Text>
          <TextInput
            style={styles.input}
            value={passwords.current}
            onChangeText={(text) => setPasswords({ ...passwords, current: text })}
            secureTextEntry
            placeholder="Zadejte současné heslo"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nové heslo</Text>
          <TextInput
            style={styles.input}
            value={passwords.new}
            onChangeText={(text) => setPasswords({ ...passwords, new: text })}
            secureTextEntry
            placeholder="Zadejte nové heslo"
          />
        </View>
      </View>

      {/* E-shop settings */}
      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Nastavení e-shopu</Text>
        <View style={styles.formRow}>
          <Text style={styles.label}>Režim údržby</Text>
          <Switch
            value={settings.maintenanceMode}
            onValueChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
        <View style={styles.formRow}>
          <Text style={styles.label}>Povolit registrace</Text>
          <Switch
            value={settings.allowRegistrations}
            onValueChange={(value) => setSettings({ ...settings, allowRegistrations: value })}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
      </View>

      <View style={styles.settingsActions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={saveSettings}>
          <Ionicons name="save" size={16} color={COLORS.white} />
          <Text style={styles.btnText}>Uložit nastavení</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ===== POMOCNÉ KOMPONENTY =====

function LoadingSpinner() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

function EmptyState({ icon, message }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={COLORS.border} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

function StatCard({ icon, iconBg, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={COLORS.white} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    new: { bg: '#dbeafe', color: '#1d4ed8', text: 'Nová' },
    processing: { bg: '#fef3c7', color: '#d97706', text: 'Zpracovává se' },
    completed: { bg: '#d1fae5', color: '#059669', text: 'Dokončeno' },
    sent: { bg: '#d1fae5', color: '#059669', text: 'Odesláno' },
    failed: { bg: '#fee2e2', color: '#dc2626', text: 'Chyba' },
    pending: { bg: '#fef3c7', color: '#d97706', text: 'Čeká' },
    low: { bg: '#d1fae5', color: '#059669', text: 'Nízká' },
    medium: { bg: '#fef3c7', color: '#d97706', text: 'Střední' },
    high: { bg: '#fee2e2', color: '#dc2626', text: 'Vysoká' },
  };

  const config = statusConfig[status] || statusConfig.new;

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
}

function OrderRow({ order, onPress, onStatusChange, compact }) {
  const date = new Date(order.created).toLocaleDateString('cs-CZ');

  return (
    <TouchableOpacity style={styles.tableRow} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowId}>#{order.id}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{order.customer?.first_name}</Text>
          <Text style={styles.rowSubtitle}>{date}</Text>
        </View>
        <Text style={styles.rowPrice}>{formatPrice(order.total)}</Text>
        <StatusBadge status={order.status} />
      </View>
      {!compact && onStatusChange && (
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => onStatusChange(order.id, 'processing')}
          >
            <Ionicons name="cog" size={16} color={COLORS.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.successBtn]}
            onPress={() => onStatusChange(order.id, 'completed')}
          >
            <Ionicons name="checkmark" size={16} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function OrderDetail({ order, onStatusChange }) {
  return (
    <View>
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Informace o objednávce</Text>
        <InfoRow label="ID" value={`#${order.id}`} />
        <InfoRow label="Datum" value={new Date(order.created).toLocaleString('cs-CZ')} />
        <InfoRow label="Celkem" value={formatPrice(order.total)} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Stav</Text>
          <StatusBadge status={order.status} />
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Zákazník</Text>
        <InfoRow label="Jméno" value={order.customer?.first_name} />
        <InfoRow label="E-mail" value={order.customer?.email} />
        <InfoRow label="Telefon" value={order.customer?.phone} />
        <InfoRow label="Adresa" value={order.customer?.street} />
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Položky</Text>
        {order.items?.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View>
              <Text style={styles.orderItemName}>{item.name}</Text>
              <Text style={styles.orderItemPrice}>
                {formatPrice(item.price)} × {item.quantity} ks
              </Text>
            </View>
            <Text style={styles.orderItemTotal}>{formatPrice(item.price * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.orderTotal}>
          <Text style={styles.orderTotalLabel}>Celkem:</Text>
          <Text style={styles.orderTotalValue}>{formatPrice(order.total)}</Text>
        </View>
      </View>

      {order.note && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Poznámka</Text>
          <Text style={styles.noteText}>{order.note}</Text>
        </View>
      )}

      <View style={styles.detailActions}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => onStatusChange(order.id, 'processing')}
        >
          <Ionicons name="cog" size={16} color={COLORS.text} />
          <Text style={styles.btnTextSecondary}>Zpracovávat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSuccess}
          onPress={() => onStatusChange(order.id, 'completed')}
        >
          <Ionicons name="checkmark" size={16} color={COLORS.white} />
          <Text style={styles.btnText}>Dokončit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductRow({ product, onEdit, onDelete }) {
  return (
    <View style={styles.tableRow}>
      <View style={styles.rowMain}>
        <Text style={styles.rowId}>#{product.id}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{product.name}</Text>
          <Text style={styles.rowSubtitle}>{CATEGORIES[product.category]}</Text>
        </View>
        <Text style={styles.rowPrice}>{formatPrice(product.price)}</Text>
        {product.featured && <Ionicons name="star" size={16} color={COLORS.warning} />}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={onEdit}>
          <Ionicons name="pencil" size={16} color={COLORS.info} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    description: product?.description || '',
    category: product?.category || 'zviratka',
    emoji: product?.emoji || '',
    color: product?.color || '#ffc2d1',
    featured: product?.featured || false,
    image_url: product?.image || '',
  });

  const handleSubmit = () => {
    if (!form.name || !form.price || !form.description) {
      showNotification('Vyplňte všechna povinná pole', 'error');
      return;
    }
    onSave({
      ...form,
      price: parseFloat(form.price),
    });
  };

  return (
    <View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Název produktu *</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Cena (Kč) *</Text>
        <TextInput
          style={styles.input}
          value={form.price}
          onChangeText={(text) => setForm({ ...form, price: text })}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Popis *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
          multiline
          numberOfLines={4}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Kategorie</Text>
        <View style={styles.categoryPicker}>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.categoryOption, form.category === key && styles.categoryOptionActive]}
              onPress={() => setForm({ ...form, category: key })}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  form.category === key && styles.categoryOptionTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>URL obrázku</Text>
        <TextInput
          style={styles.input}
          value={form.image_url}
          onChangeText={(text) => setForm({ ...form, image_url: text })}
          placeholder="https://..."
        />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.label}>Doporučovaný produkt</Text>
        <Switch
          value={form.featured}
          onValueChange={(value) => setForm({ ...form, featured: value })}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
        />
      </View>
      <View style={styles.formActions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
          <Text style={styles.btnTextSecondary}>Zrušit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit}>
          <Text style={styles.btnText}>Uložit produkt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StockRow({ product, onUpdateStock }) {
  const stockClass =
    product.stock === 0 ? 'out' : product.stock < 5 ? 'low' : 'ok';
  const stockColors = {
    out: { bg: '#fee2e2', color: COLORS.danger },
    low: { bg: '#fef3c7', color: COLORS.warning },
    ok: { bg: '#d1fae5', color: COLORS.secondary },
  };

  return (
    <View style={styles.tableRow}>
      <View style={styles.rowMain}>
        <Text style={styles.rowId}>#{product.id}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{product.name}</Text>
          <Text style={styles.rowSubtitle}>{CATEGORIES[product.category]}</Text>
        </View>
        <View style={[styles.stockBadge, { backgroundColor: stockColors[stockClass].bg }]}>
          <Text style={{ color: stockColors[stockClass].color, fontWeight: '600' }}>
            {product.stock} ks
          </Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.quickStockBtn, styles.addStockBtn]}
          onPress={() => onUpdateStock(product.id, product.stock + 1)}
        >
          <Ionicons name="add" size={16} color={COLORS.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickStockBtn, styles.removeStockBtn]}
          onPress={() => onUpdateStock(product.id, product.stock - 1)}
        >
          <Ionicons name="remove" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmailRow({ email }) {
  const date = new Date(email.created).toLocaleDateString('cs-CZ');
  return (
    <View style={styles.tableRow}>
      <View style={styles.rowMain}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{email.recipient}</Text>
          <Text style={styles.rowSubtitle}>{email.subject}</Text>
        </View>
        <Text style={styles.rowDate}>{date}</Text>
        <StatusBadge status={email.status} />
      </View>
    </View>
  );
}

function MessageRow({ message, onPress, onDelete }) {
  const date = new Date(message.created).toLocaleDateString('cs-CZ');
  const isRead = message.read;

  return (
    <TouchableOpacity style={[styles.tableRow, !isRead && styles.unreadRow]} onPress={onPress}>
      <View style={styles.rowMain}>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, !isRead && styles.unreadText]}>{message.name}</Text>
          <Text style={styles.rowSubtitle}>{message.email}</Text>
          <Text style={styles.rowMessage} numberOfLines={1}>
            {message.message}
          </Text>
        </View>
        <Text style={styles.rowDate}>{date}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MessageDetail({ message }) {
  const date = new Date(message.created).toLocaleString('cs-CZ');

  return (
    <View>
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Informace o odesílateli</Text>
        <InfoRow label="Jméno" value={message.name} />
        <InfoRow label="E-mail" value={message.email} />
        <InfoRow label="Datum" value={date} />
      </View>
      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>Zpráva</Text>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message.message}</Text>
        </View>
      </View>
      {message.response && (
        <View style={styles.detailSection}>
          <Text style={styles.detailTitle}>Odpověď</Text>
          <View style={[styles.messageBox, styles.responseBox]}>
            <Text style={styles.messageText}>{message.response}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function AlertRow({ alert, onDelete }) {
  const date = new Date(alert.created).toLocaleDateString('cs-CZ');

  return (
    <View style={styles.tableRow}>
      <View style={styles.rowMain}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{alert.title}</Text>
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {alert.message}
          </Text>
        </View>
        <StatusBadge status={alert.priority} />
        <Text style={styles.rowDate}>{date}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReviewRow({ review, onDelete }) {
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const date = new Date(review.date).toLocaleDateString('cs-CZ');

  return (
    <View style={styles.tableRow}>
      <View style={styles.rowMain}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{review.product_name}</Text>
          <Text style={styles.rowSubtitle}>
            {review.author} • <Text style={styles.stars}>{stars}</Text>
          </Text>
          <Text style={styles.rowMessage} numberOfLines={2}>
            {review.comment}
          </Text>
        </View>
        <Text style={styles.rowDate}>{date}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Ionicons name="trash" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

// ===== POMOCNÉ FUNKCE =====

async function fetchData(url, token) {
  // Special handling for orders
  if (url.includes('/orders')) {
    const ordersUrl = 'https://fluffini.cz/orders.json';
    const response = await fetch(ordersUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const orders = await response.json();

    const match = url.match(/\/orders\/(\d+)/);
    if (match) {
      const orderId = parseInt(match[1]);
      const order = orders.find((o) => o.id === orderId);
      return order || Promise.reject(new Error('Objednávka nenalezena'));
    }
    return orders;
  }

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price || 0);
}

function showNotification(message, type = 'info') {
  Alert.alert(
    type === 'success' ? 'Úspěch' : type === 'error' ? 'Chyba' : 'Info',
    message
  );
}

// ===== STYLY =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    flexDirection: isWeb ? 'row' : 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
  },

  // Login
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 20,
  },
  loginBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    }),
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 15,
  },
  loginSubtitle: {
    color: COLORS.textLight,
    marginTop: 5,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  errorText: {
    color: COLORS.danger,
    flex: 1,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  demoText: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: 20,
    fontSize: 13,
  },

  // Sidebar
  sidebar: {
    width: 250,
    backgroundColor: COLORS.dark,
    height: isWeb ? '100vh' : '100%',
    position: isWeb ? 'fixed' : 'absolute',
    left: 0,
    top: 0,
    zIndex: 100,
  },
  sidebarHeader: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  sidebarMenu: {
    flex: 1,
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: COLORS.primary,
  },
  menuItemText: {
    color: COLORS.textLight,
    fontSize: 15,
  },
  menuItemTextActive: {
    color: COLORS.white,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  userDetails: {},
  userName: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  userRole: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  logoutBtnSidebar: {
    padding: 8,
  },

  // Header
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    padding: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark,
  },
  logoutBtn: {
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 14,
  },

  // Main content
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContentWithSidebar: {
    marginLeft: 250,
  },
  content: {
    flex: 1,
    padding: 16,
  },

  // Bottom tab bar
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: isWeb ? 200 : width / 2 - 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {},
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Tables
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tableBody: {},
  tableRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  rowId: {
    color: COLORS.textLight,
    fontSize: 12,
    minWidth: 40,
  },
  rowInfo: {
    flex: 1,
    minWidth: 100,
  },
  rowTitle: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  rowPrice: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  rowDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  rowMessage: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  unreadRow: {
    backgroundColor: '#f0f9ff',
  },
  unreadText: {
    fontWeight: '700',
  },

  // Buttons
  btnPrimary: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  btnSecondary: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  btnSuccess: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 14,
  },
  btnTextSecondary: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 14,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#dbeafe',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  successBtn: {
    backgroundColor: '#dcfce7',
  },
  quickStockBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  addStockBtn: {
    backgroundColor: '#d1fae5',
    borderColor: COLORS.secondary,
  },
  removeStockBtn: {
    backgroundColor: '#fee2e2',
    borderColor: COLORS.danger,
  },

  // Status badge
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: COLORS.textLight,
    marginTop: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalBody: {
    padding: 16,
  },

  // Forms
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.light,
  },
  categoryOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryOptionText: {
    color: COLORS.text,
    fontSize: 13,
  },
  categoryOptionTextActive: {
    color: COLORS.white,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    opacity: 0.6,
  },
  priorityBtnActive: {
    opacity: 1,
  },
  priorityBtnText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 13,
  },

  // Filters
  filtersRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.light,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 12,
    color: COLORS.text,
  },
  filterBtnTextActive: {
    color: COLORS.white,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  stockSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  summaryText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Emails
  emailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  emailStatCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  emailStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emailStatLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Details
  detailSection: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  infoList: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  infoValue: {
    color: COLORS.dark,
    fontWeight: '500',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },

  // Order detail
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  orderItemName: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  orderItemPrice: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  orderItemTotal: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  noteText: {
    backgroundColor: COLORS.light,
    padding: 12,
    borderRadius: 8,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageBox: {
    backgroundColor: COLORS.light,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  responseBox: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: COLORS.secondary,
  },
  messageText: {
    color: COLORS.text,
    lineHeight: 22,
  },

  // Analytics
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
  },
  categoryBars: {
    gap: 12,
  },
  categoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryLabel: {
    width: 70,
    fontSize: 12,
    color: COLORS.text,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  categoryValue: {
    width: 50,
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'right',
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  topProductRank: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    width: 30,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontWeight: '600',
    color: COLORS.dark,
  },
  topProductStats: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Settings
  settingsActions: {
    marginBottom: 40,
  },

  // Footer
  footerInfo: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },

  // Stars
  stars: {
    color: COLORS.warning,
  },
});
