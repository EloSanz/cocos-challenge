module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['test/regression/features/step_definitions/**/*.ts'],
    format: ['progress'],
    paths: ['test/regression/features/**/*.feature']
  },
  stress: {
    requireModule: ['ts-node/register'],
    require: ['test/stress/features/step_definitions/**/*.ts'],
    format: ['progress'],
    paths: ['test/stress/features/**/*.feature']
  }
}
