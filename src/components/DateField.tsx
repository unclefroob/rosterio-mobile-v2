import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import glassTheme from '../theme/glassTheme';

interface DateFieldProps {
  label: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (date: Date) => void;
}

export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  minimumDate,
  maximumDate,
  onChange,
}) => {
  // Android: show the modal picker imperatively
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iosPickerWrap}>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
            style={styles.iosPicker}
            textColor={glassTheme.colors.text.primary}
          />
        </View>
      </View>
    );
  }

  // Android: show a tappable row that opens the system modal
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.androidButton}
        onPress={() => setShowAndroidPicker(true)}
        accessibilityLabel={`${label}: ${format(value, 'EEE d MMM yyyy')}`}
        accessibilityRole="button"
      >
        <Text style={styles.androidButtonText}>
          {format(value, 'EEE d MMM yyyy')}
        </Text>
      </TouchableOpacity>
      {showAndroidPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: glassTheme.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: glassTheme.colors.text.secondary,
    marginBottom: glassTheme.spacing.xs,
    letterSpacing: 0.2,
    fontFamily: glassTheme.typography.fontFamily.semiBold,
  },
  iosPickerWrap: {
    backgroundColor: glassTheme.colors.background.tertiary,
    borderRadius: glassTheme.radius.medium,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
    overflow: 'hidden',
  },
  iosPicker: {
    height: 120,
    width: '100%',
  },
  androidButton: {
    backgroundColor: glassTheme.colors.background.tertiary,
    borderRadius: glassTheme.radius.medium,
    borderWidth: 1,
    borderColor: glassTheme.border.color,
    paddingVertical: glassTheme.spacing.md,
    paddingHorizontal: glassTheme.spacing.lg,
  },
  androidButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: glassTheme.colors.text.primary,
    fontFamily: glassTheme.typography.fontFamily.medium,
  },
});

export default DateField;
