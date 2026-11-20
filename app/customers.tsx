import React from 'react';
import { router } from 'expo-router';
import { CustomersScreen } from '../src/screens/customers';

export default function Customers() {
  return <CustomersScreen onSelect={id => router.push({ pathname: '/customer', params: { id } })} />;
}
