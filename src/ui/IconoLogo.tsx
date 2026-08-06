import { Image } from 'react-native';

interface Props {
  size?: number;
  opacity?: number;
}

export function IconoLogo({ size = 22, opacity = 1 }: Props) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: size, height: size * 0.915, opacity }}
      resizeMode="contain"
    />
  );
}
