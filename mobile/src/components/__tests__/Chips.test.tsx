import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ChipRow, MultiChipRow, type ChipOption } from '../Chips';

type Sort = 'staleness' | 'combined';
const sortOptions: ChipOption<Sort>[] = [
  { value: 'staleness', label: 'Staleness' },
  { value: 'combined', label: 'Combined' },
];

type GatheringType = 'FAMILY' | 'KIDS_ONLY';
const gatheringTypeOptions: ChipOption<GatheringType>[] = [
  { value: 'FAMILY', label: 'Family' },
  { value: 'KIDS_ONLY', label: 'Kids only' },
];

describe('ChipRow', () => {
  test('render__called__marks_only_the_selected_option', async () => {
    // Act
    await render(<ChipRow options={sortOptions} selected="staleness" onSelect={jest.fn()} label="Sort by" />);

    // Assert
    expect(screen.getByText('Sort by')).toBeTruthy();
    expect(screen.getByText('Staleness')).toBeTruthy();
    expect(screen.getByText('Combined')).toBeTruthy();
  });

  test('press_an_option__called__calls_onSelect_with_that_options_value', async () => {
    // Arrange
    const onSelect = jest.fn();
    await render(<ChipRow options={sortOptions} selected="staleness" onSelect={onSelect} label="Sort by" />);

    // Act
    await fireEvent.press(screen.getByText('Combined'));

    // Assert
    expect(onSelect).toHaveBeenCalledWith('combined');
  });
});

describe('MultiChipRow', () => {
  test('render__called__marks_options_present_in_selectedValues', async () => {
    // Act
    await render(
      <MultiChipRow
        options={gatheringTypeOptions}
        selectedValues={new Set<GatheringType>(['FAMILY'])}
        onToggle={jest.fn()}
        label="Gathering types"
      />,
    );

    // Assert
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Kids only')).toBeTruthy();
  });

  test('press_an_option__called__calls_onToggle_with_that_options_value', async () => {
    // Arrange
    const onToggle = jest.fn();
    await render(
      <MultiChipRow
        options={gatheringTypeOptions}
        selectedValues={new Set<GatheringType>()}
        onToggle={onToggle}
        label="Gathering types"
      />,
    );

    // Act
    await fireEvent.press(screen.getByText('Kids only'));

    // Assert
    expect(onToggle).toHaveBeenCalledWith('KIDS_ONLY');
  });
});
