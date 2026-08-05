import Svg, { Circle, Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export function IconoCejas({ size = 22, color = '#000' }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4.5 5.5c4.6-2.4 10.4-2.4 15 0" />
      <Path d="M2.5 12.5c2.6-3.6 5.9-5.2 9.5-5.2s6.9 1.6 9.5 5.2c-2.6 3.6-5.9 5.2-9.5 5.2s-6.9-1.6-9.5-5.2Z" />
      <Circle cx="12" cy="12.4" r="2.3" />
    </Svg>
  );
}
