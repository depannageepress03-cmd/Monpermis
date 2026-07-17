import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { dark, fonts } from '../theme'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Une erreur est survenue</Text>
        <Text style={styles.message}>{this.state.error.message}</Text>
        <Pressable
          style={styles.button}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: dark.bg,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
    marginBottom: 10,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    marginBottom: 20,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    color: '#0B0F1A',
    fontSize: 15,
  },
})
